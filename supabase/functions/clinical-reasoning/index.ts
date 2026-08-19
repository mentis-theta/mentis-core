// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js";
import { pipeline, env } from "npm:@huggingface/transformers";

import { buildClinicalContext } from "../_shared/ragContext.ts";
import { buildSystemPrompt, buildUserPrompt, transformToLegacyFormat, ValidationReport } from "../_shared/evidenceContract.ts";
import type { GatedClinicalResponse } from "../_shared/evidenceContract.ts";
import { generateValidationReport, ValidationContextDocument } from "../_shared/deterministicValidator.ts";
import { enforceStructuralIntegrity } from "../_shared/enforcementLayer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_TIMEOUT_MS = 45_000;

// Otimização: Desabilita modelos locais pois estamos na nuvem
env.allowLocalModels = false;
env.useBrowserCache = false;
let extractorInstance: any = null;

async function getExtractor() {
  if (!extractorInstance) {
    const t0 = performance.now();
    extractorInstance = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', { revision: 'main' });
    const t1 = performance.now();
    console.log(`[Metrics] embedding_model_load_ms: ${(t1 - t0).toFixed(2)}`);
  }
  return extractorInstance;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const reqStartTime = performance.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const query = payload.query || payload.customQuery || '';

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Gera o embedding da pergunta localmente (Custo Zero)
    const tEmbedStart = performance.now();
    const extractor = await getExtractor();
    
    // OBRIGATORIO: Usar o prefixo search_query para queries (Nomic spec)
    const textToEmbed = `search_query: ${query}`;
    const embedResult = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(embedResult.data);
    
    const tEmbedEnd = performance.now();
    console.log(`[Metrics] embedding_latency_ms: ${(tEmbedEnd - tEmbedStart).toFixed(2)}`);

    // 2. Busca no Supabase RAG (match_clinical_documents)
    const tRetStart = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: ragDocuments, error: ragError } = await supabase.rpc('match_clinical_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 5
    });
    const tRetEnd = performance.now();
    console.log(`[Metrics] retrieval_latency_ms: ${(tRetEnd - tRetStart).toFixed(2)}`);

    if (ragError) {
      console.error("Erro na busca RAG:", ragError);
    }

    // 3. Monta o Contexto do Banco com Proveniência Clínica
    const contextText = buildClinicalContext(ragDocuments);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // 4. Gate 3A — Evidence Contract
    // System Instruction SEPARADO do contents (antes estava tudo misturado)
    // Temperature NÃO é alterada (mantém default do baseline para isolamento causal)
    const systemInstruction = buildSystemPrompt();
    const userPrompt = buildUserPrompt(contextText, query);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini timeout: a análise excedeu 45 segundos.')), GEMINI_TIMEOUT_MS);
    });

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      systemInstruction: systemInstruction,
      config: {
        responseMimeType: "application/json",
      }
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    
    // 5. Parse do JSON gerado pelo LLM
    let gatedResponse: GatedClinicalResponse;
    try {
      let textToParse = response.text;
      textToParse = textToParse.replace(/^```json/g, '').replace(/```$/g, '').trim();
      textToParse = textToParse.replace(/^```/g, '').replace(/```$/g, '').trim();
      gatedResponse = JSON.parse(textToParse);
    } catch (e) {
      throw new Error('Formato JSON inválido retornado pelo LLM: ' + response.text);
    }

    // Mapeia ragDocuments para ValidationContextDocument do Gate 3B
    const validationDocs: ValidationContextDocument[] = ragDocuments ? ragDocuments.map((doc: any) => ({
      chunk_id: doc.metadata?.chunk_id || doc.id,
      content: doc.content
    })) : [];

    // Executa a validação determinística (Gate 3B)
    const validationReport = generateValidationReport(gatedResponse.evidence_chains, validationDocs);
    if (validationReport.invalid_claims > 0) {
      console.warn(`[Gate 3B Audit] ${validationReport.invalid_claims} claims com falha estrutural.`);
      console.warn(JSON.stringify(validationReport.claim_validations.filter(c => c.status === 'INVALID')));
    }

    // Gate 3D: Enforcement Layer (Supressão Estrutural)
    const enforcedResponse = enforceStructuralIntegrity(gatedResponse, validationReport);

    // 6. Transform Layer — Constrói o clinical_summary NO BACKEND
    //    O LLM nunca gera o summary — isso fecha a porta de fuga.
    //    Converte GatedClinicalResponse → formato legado { state, narrative }
    //    Passa o validationReport para injetar em _gate3_meta
    const legacyResponse = transformToLegacyFormat(enforcedResponse, validationReport);

    const tEnd = performance.now();
    console.log(`[Metrics] total_latency_ms: ${(tEnd - reqStartTime).toFixed(2)}`);

    return new Response(JSON.stringify(legacyResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("[ClinicalReasoning Error]", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
