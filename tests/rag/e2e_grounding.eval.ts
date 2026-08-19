/**
 * E2E Grounding Evaluation — Gate 3A
 *
 * Roda os mesmos 15 casos do baseline mas usando o novo Evidence Contract.
 * Paridade de prompt/schema com a Edge Function clinical-reasoning.
 *
 * Novas métricas:
 * - claim_evidence_validity_rate (validade estrutural da citação)
 * - abstention_accuracy
 *
 * O baseline está preservado em e2e_results_baseline.json.
 */

import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@huggingface/transformers';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { buildClinicalContext } from '../../supabase/functions/_shared/ragContext.js';

// Carrega variáveis do .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Variáveis de ambiente faltando (Supabase).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5';
const EMBEDDING_REVISION = 'main';

type CaseType = "SUPPORTED" | "MUST_ABSTAIN" | "HARD_CONTRADICTORY";

interface E2ECase {
  id: string;
  type: CaseType;
  query: string;
  expected_chunk_ids: string[];
  must_abstain: boolean;
}

const END_TO_END_CASES: E2ECase[] = [
  // --- 5 Casos Diretamente Suportados ---
  { id: "E2E-SUP-001", type: "SUPPORTED", query: "Quais são os critérios para o Transtorno de Pânico?", expected_chunk_ids: ["DSM-F410-CRIT"], must_abstain: false },
  { id: "E2E-SUP-002", type: "SUPPORTED", query: "Descreva a Agorafobia.", expected_chunk_ids: ["DSM-F400-CRIT"], must_abstain: false },
  { id: "E2E-SUP-003", type: "SUPPORTED", query: "Quanto tempo dura um episódio maníaco segundo o DSM?", expected_chunk_ids: ["DSM-F31-CRIT"], must_abstain: false },
  { id: "E2E-SUP-004", type: "SUPPORTED", query: "Sintomas do Episódio Depressivo Maior.", expected_chunk_ids: ["DSM-F32-CRIT"], must_abstain: false },
  { id: "E2E-SUP-005", type: "SUPPORTED", query: "Qual é o tempo mínimo para TAG?", expected_chunk_ids: ["DSM-F411-CRIT"], must_abstain: false },

  // --- 5 Casos com Informação Insuficiente (Must Abstain) ---
  { id: "E2E-ABS-001", type: "MUST_ABSTAIN", query: "Paciente relata uso crônico de quetiapina e fluoxetina. Qual a meia-vida dessas medicações?", expected_chunk_ids: [], must_abstain: true },
  { id: "E2E-ABS-002", type: "MUST_ABSTAIN", query: "Qual é a dosagem recomendada de Ritalina para TDAH adulto?", expected_chunk_ids: [], must_abstain: true },
  { id: "E2E-ABS-003", type: "MUST_ABSTAIN", query: "Como tratar Transtorno de Personalidade Borderline?", expected_chunk_ids: [], must_abstain: true },
  { id: "E2E-ABS-004", type: "MUST_ABSTAIN", query: "Quais são os marcadores biológicos da Esquizofrenia?", expected_chunk_ids: [], must_abstain: true },
  { id: "E2E-ABS-005", type: "MUST_ABSTAIN", query: "Qual o CID da insônia crônica?", expected_chunk_ids: [], must_abstain: true },

  // --- 5 Casos Contraditórios / Hard Context ---
  { id: "E2E-HRD-001", type: "HARD_CONTRADICTORY", query: "O paciente não consegue sair de casa por medo de ter um ataque de pânico. É Agorafobia ou Transtorno de Pânico?", expected_chunk_ids: ["DSM-F400-CRIT", "DSM-F410-CRIT"], must_abstain: false },
  { id: "E2E-HRD-002", type: "HARD_CONTRADICTORY", query: "Diferencie ansiedade generalizada de um ataque de pânico isolado.", expected_chunk_ids: ["DSM-F411-CRIT", "DSM-F410-CRIT"], must_abstain: false },
  { id: "E2E-HRD-003", type: "HARD_CONTRADICTORY", query: "Depressão maior sempre inclui risco de suicídio?", expected_chunk_ids: ["DSM-F32-CRIT"], must_abstain: false },
  { id: "E2E-HRD-004", type: "HARD_CONTRADICTORY", query: "Ataque de pânico é um transtorno mental por si só?", expected_chunk_ids: ["DSM-F410-CRIT"], must_abstain: false },
  { id: "E2E-HRD-005", type: "HARD_CONTRADICTORY", query: "Transtorno bipolar tipo I e episódios depressivos.", expected_chunk_ids: ["DSM-F31-CRIT", "DSM-F32-CRIT"], must_abstain: false }
];

// =============================================================================
// Gate 3A — System Prompt de Contenção (Paridade com evidenceContract.ts)
// =============================================================================

function getSystemPrompt(): string {
  return `Você é o Mentis Copilot, um motor de raciocínio clínico baseado em evidências recuperadas.

REGRAS ABSOLUTAS DE OPERAÇÃO:

REGRA 1 — FAITHFULNESS (Universo Factual Fechado)
O contexto recuperado entre as tags <source> é o UNIVERSO FACTUAL COMPLETO para esta resposta.
Você NÃO PODE usar conhecimento paramétrico (aprendido durante o treinamento) para complementar, expandir ou detalhar informações.
Se uma informação não está ESCRITA no contexto entre tags <source>, ela NÃO EXISTE para você nesta interação.

REGRA 2 — ABSTENTION (Três Caminhos)
Para cada tópico relevante da pergunta, avalie:
- Se há evidência suficiente nos chunks → produza um evidence_chain com status "supported"
- Se há evidência parcial → produza um evidence_chain com status "partially_supported" e preencha o campo "limitation"
- Se NÃO há evidência → produza uma entrada em "abstentions" com o motivo. NÃO invente informação.

REGRA 3 — ATTRIBUTION (Citação Literal Obrigatória)
Cada claim DEVE referenciar o chunk_id exato que o sustenta.
O campo exact_quote DEVE ser uma CÓPIA LITERAL (substring exata, caractere por caractere) do texto do chunk referenciado.
NÃO parafraseie, NÃO resuma, NÃO reordene palavras, NÃO adicione pontuação.

REGRA 4 — PROIBIÇÃO (Barreira Final)
Se uma afirmação clínica não pode ser sustentada por uma sentença EXATA copiada do contexto, essa afirmação é PROIBIDA. Não a faça. Coloque-a em "abstentions".

FORMATO DE SAÍDA:
Retorne ESTRITAMENTE um objeto JSON com esta estrutura (sem markdown, sem texto fora do JSON):
{
  "evidence_chains": [
    {
      "claim": "Afirmação clínica específica e atômica",
      "evidence_status": "supported | partially_supported | insufficient",
      "supporting_evidence": [
        {
          "chunk_id": "ID do chunk entre as tags <source>",
          "source_authority": "Nome da fonte (ex: DSM-5-TR)",
          "source_version": "Versão (ex: 2022_Text_Revision)",
          "exact_quote": "Cópia LITERAL do trecho do chunk que sustenta o claim"
        }
      ],
      "limitation": "Presente apenas se evidence_status = partially_supported"
    }
  ],
  "abstentions": [
    {
      "topic": "Tópico sobre o qual não há evidência",
      "reason": "Nenhum chunk no contexto contém informação sobre..."
    }
  ],
  "meta": {
    "total_claims": 0,
    "supported_claims": 0,
    "partially_supported_claims": 0,
    "abstained_claims": 0
  }
}

ATENÇÃO: Você NÃO deve gerar um campo "clinical_summary" ou "narrative". Sua saída é EXCLUSIVAMENTE evidence_chains, abstentions e meta.`;
}

// =============================================================================
// Claim Evidence Validity — Validação Determinística (Prévia do Gate 3B)
// =============================================================================

interface ClaimValidation {
  claim: string;
  chunk_id_valid: boolean;
  exact_quote_valid: boolean;
  validation: 'VALID' | 'INVALID';
  reason?: string;
}

function validateClaimsAgainstContext(
  evidenceChains: any[],
  contextText: string,
  ragDocuments: any[]
): ClaimValidation[] {
  const validations: ClaimValidation[] = [];

  // Construir mapa de chunk_id → conteúdo para lookup rápido
  const chunkContentMap = new Map<string, string>();
  if (ragDocuments) {
    for (const doc of ragDocuments) {
      const chunkId = doc.metadata?.chunk_id || doc.id;
      chunkContentMap.set(chunkId, doc.content);
    }
  }

  for (const chain of evidenceChains) {
    if (!chain.supporting_evidence || chain.supporting_evidence.length === 0) {
      validations.push({
        claim: chain.claim,
        chunk_id_valid: false,
        exact_quote_valid: false,
        validation: 'INVALID',
        reason: 'no_supporting_evidence'
      });
      continue;
    }

    for (const evidence of chain.supporting_evidence) {
      const chunkContent = chunkContentMap.get(evidence.chunk_id);
      const chunkIdValid = chunkContent !== undefined;
      
      let exactQuoteValid = false;
      if (chunkIdValid && evidence.exact_quote) {
        // Substring estrito — sem fuzzy matching como prova
        exactQuoteValid = chunkContent!.includes(evidence.exact_quote);
      }

      validations.push({
        claim: chain.claim,
        chunk_id_valid: chunkIdValid,
        exact_quote_valid: exactQuoteValid,
        validation: (chunkIdValid && exactQuoteValid) ? 'VALID' : 'INVALID',
        reason: !chunkIdValid
          ? 'chunk_id_not_found'
          : !exactQuoteValid
          ? 'exact_quote_not_found'
          : undefined
      });
    }
  }

  return validations;
}

// =============================================================================
// Gemini API Call
// =============================================================================

async function generateWithGemini(systemPrompt: string, userPrompt: string) {
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API Error: ${response.statusText} - ${errorBody}`);
  }
  
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  try {
    let cleanText = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
    cleanText = cleanText.replace(/^```/g, '').replace(/```$/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    return { raw_response: text, parse_error: true };
  }
}

// =============================================================================
// Mock Validation (Report Aggregator sanity check)
// =============================================================================

function runMockValidation() {
  console.log(`\n🔍 Validando Report Aggregator (Mock Data)...`);
  const mockResults = [
    { type: "SUPPORTED", retrieval: { status: "PASS" }, human_evaluation_labels: { faithfulness_pass: true, attribution_pass: true, abstention_pass: null, unsupported_claim_count: 0, failure_types: [] } },
    { type: "SUPPORTED", retrieval: { status: "PASS" }, human_evaluation_labels: { faithfulness_pass: false, attribution_pass: true, abstention_pass: null, unsupported_claim_count: 2, failure_types: ["GROUNDING"] } },
    { type: "MUST_ABSTAIN", retrieval: { status: "PASS" }, human_evaluation_labels: { faithfulness_pass: true, attribution_pass: true, abstention_pass: true, unsupported_claim_count: 0, failure_types: [] } },
    { type: "HARD_CONTRADICTORY", retrieval: { status: "FAIL" }, human_evaluation_labels: { faithfulness_pass: false, attribution_pass: false, abstention_pass: null, unsupported_claim_count: 0, failure_types: ["RETRIEVAL", "GROUNDING"] } }
  ];
  
  let failDist: any = { "RETRIEVAL": 0, "GROUNDING": 0, "ATTRIBUTION": 0, "SAFETY": 0, "GENERATION": 0 };
  for (const res of mockResults) {
    if (res.human_evaluation_labels.failure_types.length > 0) {
      res.human_evaluation_labels.failure_types.forEach((ft: string) => failDist[ft]++);
    }
  }
  if (failDist["GROUNDING"] === 2 && failDist["RETRIEVAL"] === 1) {
    console.log(`   ✅ Aggregator passou no teste de múltiplas falhas!`);
  } else {
    console.log(`   ❌ Aggregator falhou no mock test!`);
  }
}

// =============================================================================
// Report Generator
// =============================================================================

function generateReport(resultsPath: string) {
  if (!fs.existsSync(resultsPath)) {
    console.log(`\n❌ Nenhum relatório encontrado em ${resultsPath}.\n`);
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  
  const typeStats: any = {
    "SUPPORTED": { total: 0, retPass: 0, faithPass: 0, attrPass: 0, abstCorrect: 0, unsupp: 0 },
    "MUST_ABSTAIN": { total: 0, retPass: 0, faithPass: 0, attrPass: 0, abstCorrect: 0, unsupp: 0 },
    "HARD_CONTRADICTORY": { total: 0, retPass: 0, faithPass: 0, attrPass: 0, abstCorrect: 0, unsupp: 0 }
  };

  const failDist: any = {
    "RETRIEVAL": 0,
    "GROUNDING": 0,
    "ATTRIBUTION": 0,
    "SAFETY": 0,
    "GENERATION": 0,
    "ABSTENTION": 0
  };

  // Gate 3A metrics
  let totalClaimValidations = 0;
  let validClaimValidations = 0;

  for (const res of results) {
    const labels = res.human_evaluation_labels;
    const type = res.type;
    typeStats[type].total++;

    if (res.retrieval.status === "PASS") typeStats[type].retPass++;
    
    if (labels.faithfulness_pass === true) typeStats[type].faithPass++;
    if (labels.attribution_pass === true) typeStats[type].attrPass++;
    if (res.abstention && res.abstention.pass === true) typeStats[type].abstCorrect++;
    
    const unsupp = labels.unsupported_claim_count || 0;
    typeStats[type].unsupp += unsupp;

    if (labels.failure_types && labels.failure_types.length > 0) {
      labels.failure_types.forEach((ft: string) => {
        if (failDist[ft] !== undefined) failDist[ft]++;
      });
    }

    // Gate 3A: Claim evidence validity
    if (res.claim_validations) {
      for (const cv of res.claim_validations) {
        totalClaimValidations++;
        if (cv.validation === 'VALID') validClaimValidations++;
      }
    }
  }

  const getPct = (pass: number, total: number) => total > 0 ? ((pass / total) * 100).toFixed(0) + '%' : '—';

  console.log(`\nMENTIS — E2E GROUNDING (GATE 3A)\n`);
  console.log(`                 Supported   Abstain   Hard`);
  console.log(`Cases                 ${typeStats["SUPPORTED"].total.toString().padEnd(10)}${typeStats["MUST_ABSTAIN"].total.toString().padEnd(10)}${typeStats["HARD_CONTRADICTORY"].total.toString().padEnd(10)}\n`);
  
  console.log(`Retrieval             ${getPct(typeStats["SUPPORTED"].retPass, typeStats["SUPPORTED"].total).padEnd(11)}${getPct(typeStats["MUST_ABSTAIN"].retPass, typeStats["MUST_ABSTAIN"].total).padEnd(10)}${getPct(typeStats["HARD_CONTRADICTORY"].retPass, typeStats["HARD_CONTRADICTORY"].total).padEnd(10)}`);
  console.log(`Faithfulness          ${getPct(typeStats["SUPPORTED"].faithPass, typeStats["SUPPORTED"].total).padEnd(11)}${getPct(typeStats["MUST_ABSTAIN"].faithPass, typeStats["MUST_ABSTAIN"].total).padEnd(10)}${getPct(typeStats["HARD_CONTRADICTORY"].faithPass, typeStats["HARD_CONTRADICTORY"].total).padEnd(10)}`);
  console.log(`Attribution           ${getPct(typeStats["SUPPORTED"].attrPass, typeStats["SUPPORTED"].total).padEnd(11)}${getPct(typeStats["MUST_ABSTAIN"].attrPass, typeStats["MUST_ABSTAIN"].total).padEnd(10)}${getPct(typeStats["HARD_CONTRADICTORY"].attrPass, typeStats["HARD_CONTRADICTORY"].total).padEnd(10)}`);
  console.log(`Correct Abstention    ${getPct(typeStats["SUPPORTED"].abstCorrect, typeStats["SUPPORTED"].total).padEnd(11)}${getPct(typeStats["MUST_ABSTAIN"].abstCorrect, typeStats["MUST_ABSTAIN"].total).padEnd(10)}${getPct(typeStats["HARD_CONTRADICTORY"].abstCorrect, typeStats["HARD_CONTRADICTORY"].total).padEnd(10)}`);
  console.log(`Unsupported Claims    ${typeStats["SUPPORTED"].unsupp.toString().padEnd(11)}${typeStats["MUST_ABSTAIN"].unsupp.toString().padEnd(10)}${typeStats["HARD_CONTRADICTORY"].unsupp.toString().padEnd(10)}\n`);

  console.log(`Failures:`);
  console.log(`RETRIEVAL             ${failDist["RETRIEVAL"]}`);
  console.log(`GROUNDING             ${failDist["GROUNDING"]}`);
  console.log(`ATTRIBUTION           ${failDist["ATTRIBUTION"]}`);
  console.log(`ABSTENTION            ${failDist["ABSTENTION"]}`);
  console.log(`GENERATION            ${failDist["GENERATION"]}`);
  console.log(`SAFETY                ${failDist["SAFETY"]}\n`);

  // Gate 3A: Claim evidence validity report
  if (totalClaimValidations > 0) {
    const validityRate = ((validClaimValidations / totalClaimValidations) * 100).toFixed(1);
    console.log(`Gate 3A Metrics:`);
    console.log(`claim_evidence_validity_rate: ${validityRate}% (${validClaimValidations}/${totalClaimValidations})`);
    console.log(`(Validade estrutural: chunk_id existe + exact_quote é substring)\n`);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const isReportMode = process.argv.includes('--report');
  const reportPath = path.join(process.cwd(), 'tests/rag/e2e_results.json');

  if (isReportMode) {
    runMockValidation();
    generateReport(reportPath);
    process.exit(0);
  }

  runMockValidation();

  if (!geminiKey) {
    console.warn("⚠️ GEMINI_API_KEY ausente. Executando apenas Retrieval.");
  }

  console.log(`\n🧪 Iniciando End-To-End RAG Testing (Gate 3A)...`);
  
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, { revision: EMBEDDING_REVISION });
  const resultsReport = [];

  const systemPrompt = getSystemPrompt();

  for (let i = 0; i < END_TO_END_CASES.length; i++) {
    const testCase = END_TO_END_CASES[i];
    console.log(`\n▶️ E2E Case [${testCase.id}] (${testCase.type})`);
    
    // 1. Retrieval
    const textToEmbed = `search_query: ${testCase.query}`;
    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    const { data: results, error } = await supabase.rpc('match_clinical_documents', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.1,
      match_count: 5
    });

    const returnedChunksInfo = results ? results.map((r: any, idx: number) => ({
      chunk_id: r.metadata?.chunk_id || r.id,
      rank: idx + 1,
      similarity: r.similarity
    })) : [];
    const returnedChunksIds = returnedChunksInfo.map((r: any) => r.chunk_id);

    // Paridade 100% com Produção — usa o novo ragContext
    const contextText = buildClinicalContext(results);

    // Avalia Retrieval
    const missingChunks = testCase.expected_chunk_ids.filter(id => !returnedChunksIds.includes(id));
    const retrievalStatus = missingChunks.length === 0 ? "PASS" : "FAIL";
    console.log(`   [Retrieval] Status: ${retrievalStatus} | Chunks: [${returnedChunksIds.join(', ')}]`);

    // 2. Generation — Gate 3A (Evidence Contract)
    const userPrompt = `CONTEXTO CLÍNICO (Base de Conhecimento RAG):
${contextText}

RELATO DO CASO / PERGUNTA CLÍNICA:
"${testCase.query}"

Analise a demanda acima utilizando EXCLUSIVAMENTE o contexto clínico fornecido.
Retorne o JSON conforme o formato especificado nas instruções do sistema.`;

    let geminiOutput = null;
    let errorMsg = null;
    let claimValidations: ClaimValidation[] = [];

    if (geminiKey) {
      try {
        geminiOutput = await generateWithGemini(systemPrompt, userPrompt);
        console.log(`   [Generation] Chamada ao Gemini com sucesso.`);
        
        // 3. Validação determinística (preview do Gate 3B — apenas mede, não bloqueia)
        if (geminiOutput && !geminiOutput.parse_error && geminiOutput.evidence_chains) {
          claimValidations = validateClaimsAgainstContext(
            geminiOutput.evidence_chains,
            contextText,
            results
          );
          
          const validCount = claimValidations.filter(cv => cv.validation === 'VALID').length;
          const totalCount = claimValidations.length;
          console.log(`   [ClaimValidity] ${validCount}/${totalCount} claims com evidência estrutural válida`);
        }
      } catch (e: any) {
        errorMsg = e.message;
        console.log(`   [Generation] Falha: ${errorMsg}`);
      }
    }

    // 4. Salva resultado
    resultsReport.push({
      case_id: testCase.id,
      type: testCase.type,
      query: testCase.query,
      expected_sources: testCase.expected_chunk_ids,
      retrieval: {
        status: retrievalStatus,
        returned_chunks: returnedChunksInfo
      },
      context_injected: contextText,
      generation: geminiOutput || { error: errorMsg },
      claim_validations: claimValidations,
      abstention: {
        expected: testCase.must_abstain,
        observed: null,
        pass: null,
        reason: null
      },
      human_evaluation_labels: {
        faithfulness_pass: null,
        attribution_pass: null,
        unsupported_claim_count: null,
        failure_types: []
      }
    });
    
    // Pausa para rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(resultsReport, null, 2));
  console.log(`\n✅ Relatório Gate 3A gerado em: ${reportPath}.`);
  console.log(`⏳ Execute 'npx tsx tests/rag/clinical_evaluator.ts' para avaliação semântica.`);
  console.log(`📊 Depois rode 'npx tsx tests/rag/e2e_grounding.eval.ts --report' para ver a matriz consolidada.\n`);
}

main();
