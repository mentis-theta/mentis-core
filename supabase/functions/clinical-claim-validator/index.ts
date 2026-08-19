// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

const AI_MODELS = {
  REASONING_TASKS: 'gemini-1.5-pro',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_TIMEOUT_MS = 45_000;

interface ValidationPayload {
  draftText: string;
  patientFacts: ClinicalObservation[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // P0: Validação de autenticação (padrão ai-proxy)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: ValidationPayload = await req.json();
    const { draftText, patientFacts } = payload;

    if (!draftText || !patientFacts) {
      return new Response(JSON.stringify({ error: 'Missing draftText or patientFacts' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const prompt = `Você é um AUDITOR PERICIAL E DETECTOR DE SALTO INFERENCIAL.
Sua função é cruzar as afirmações feitas no texto do laudo com a escala de evidências disponíveis do paciente.

REGRAS RÍGIDAS DE CONTENÇÃO:
1. Você DEVE basear seu julgamento ÚNICA E EXCLUSIVAMENTE no array de patientFacts fornecido no payload.
2. Não assuma verdades universais ou dados externos. Se a afirmação forte no texto não tiver correspondência direta de nível igual ou superior nos patientFacts, marque inferential_leap_detected: true.
3. NÃO retorne o documento inteiro. Retorne APENAS o objeto JSON com o array de claims contendo as frases específicas que falharam no teste de evidência.
4. Se o texto for 100% válido, retorne ESTRITAMENTE o objeto: { "claims": [] }.
5. REGRA DE FORMATAÇÃO DO STATEMENT: A sua "statement" devolvida DEVE estar contida inteiramente dentro de um único parágrafo do texto original. JAMAIS inclua quebras de linha (\\n) ou cruze parágrafos diferentes na mesma citação. Copie a frase EXATAMENTE como ela aparece no draftText, sem modificar pontuação ou capitalização.

TEXTO SOB AVALIAÇÃO (Draft Text):
${draftText}

FATOS DO PACIENTE (Patient Facts):
${JSON.stringify(patientFacts, null, 2)}

Devolva ESTRITAMENTE um objeto JSON com a matriz de 'claims' inválidas:
{
  "claims": [
    {
      "statement": "Frase original extraída do draftText que contém o salto inferencial.",
      "evidence_level_found": 3,
      "minimum_required_level": 4,
      "inferential_leap_detected": true,
      "suggested_correction": "A paciente relata conflitos interpessoais..."
    }
  ]
}
`;

    // P0: Timeout de 45s alinhado com aiUtils.ts (Promise.race)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini timeout: a análise forense excedeu 45 segundos.')), GEMINI_TIMEOUT_MS);
    });

    const geminiPromise = ai.models.generateContent({
      model: AI_MODELS.REASONING_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);

    return new Response(response.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Clinical Claim Validator Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
