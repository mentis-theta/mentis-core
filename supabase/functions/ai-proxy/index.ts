// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { AI_MODELS } from '../../../config/ai_models.ts';

serve(async (req: Request) => {
  // 1. Trata o preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Verifica a autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, payload } = await req.json()

    // 3. Roteamento baseado na action (Google Gemini)
    if (action === 'generate_content') {
      const provider = payload.provider || 'gemini';

      if (provider === 'groq') {
        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
          throw new Error('GROQ_API_KEY environment variable is missing');
        }

        const contents = typeof payload.contents === 'string'
          ? [{ role: 'user', parts: [{ text: payload.contents }] }]
          : payload.contents;

        const groqMessages = contents.map((c: any) => ({
          role: c.role === 'model' ? 'assistant' : 'user',
          content: c.parts[0].text
        }));

        const generationConfig = payload.config || {};
        if (generationConfig.systemInstruction) {
          groqMessages.unshift({ role: 'system', content: generationConfig.systemInstruction.parts[0].text });
        }

        const reqBody = {
          model: payload.model || 'qwen/qwen3.6-27b',
          messages: groqMessages,
          temperature: generationConfig.temperature ?? 0.2
        };

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reqBody)
        });

        const data = await res.json();
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || JSON.stringify(data) }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const text = data.choices?.[0]?.message?.content || '';
        return new Response(JSON.stringify({ text }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing')
      }

      let modelName = payload.model || AI_MODELS.FAST_TASKS;
      // Migration to latest models according to docs
      if (modelName.includes('pro')) {
        modelName = AI_MODELS.REASONING_TASKS;
      } else if (modelName.includes('flash')) {
        modelName = AI_MODELS.FAST_TASKS;
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`

      const contents = typeof payload.contents === 'string' 
        ? [{ role: 'user', parts: [{ text: payload.contents }] }] 
        : payload.contents;

      const generationConfig = { ...(payload.config || {}) };
      const safetySettings = generationConfig.safetySettings;
      const systemInstruction = generationConfig.systemInstruction;
      delete generationConfig.safetySettings;
      delete generationConfig.systemInstruction;

      const reqBody = {
        contents,
        generationConfig,
        ...(safetySettings ? { safetySettings } : {}),
        ...(systemInstruction ? { systemInstruction } : {})
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      
      const data = await res.json()
      
      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || JSON.stringify(data) }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_models') {
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
      const res = await fetch(url)
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rotação para Groq (Transcrição)
    if (action === 'transcribe_audio') {
      const groqApiKey = Deno.env.get('GROQ_API_KEY')
      if (!groqApiKey) {
        throw new Error('GROQ_API_KEY environment variable is missing')
      }

      // O audio é recebido em base64 e precisamos converter para File/Blob para o formData
      const byteCharacters = atob(payload.audioBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const audioFile = new File([byteArray], 'audio.wav', { type: payload.mimeType || 'audio/wav' })

      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', 'whisper-large-v3')
      formData.append('response_format', 'json')
      formData.append('language', 'pt')
      formData.append('temperature', '0.0')

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || JSON.stringify(data))
      }

      return new Response(JSON.stringify({ text: data.text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Roteamento para Embeddings (RAG Clínico)
    if (action === 'embed_content') {
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing')
      }

      const modelName = payload.model || "gemini-embedding-001";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${geminiApiKey}`

      const textToEmbed = typeof payload.contents === 'string' ? payload.contents : JSON.stringify(payload.contents);

      const reqBody = {
        model: `models/${modelName}`,
        content: {
          parts: [{ text: textToEmbed }]
        },
        outputDimensionality: payload.config?.outputDimensionality || 768
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || JSON.stringify(data));
      }

      // O SDK retornava { embeddings: [{ values: [...] }] }
      // A REST API retorna { embedding: { values: [...] } }
      const embeddings = data.embedding ? [data.embedding] : [];

      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action not supported' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error("AI Proxy Error:", error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
