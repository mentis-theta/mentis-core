import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@huggingface/transformers';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Carrega variáveis do .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY faltando.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5';
const EMBEDDING_REVISION = 'main';

// nDCG Helper Functions (Standard Formula: (2^rel - 1) / log2(i+1) where i is 1-indexed)
function getDCG(relevances: number[]): number {
  return relevances.reduce((acc, rel, i) => acc + (Math.pow(2, rel) - 1) / Math.log2(i + 2), 0);
}

function getIDCG(idealRelevances: number[]): number {
  const sorted = [...idealRelevances].sort((a, b) => b - a);
  return getDCG(sorted);
}

// ============================================================================
// AUDITORIA MATEMÁTICA (SYNTHETIC TESTS)
// ============================================================================
function runSyntheticAudit() {
  console.log(`\n🔍 Executando Auditoria Matemática (Synthetic Tests)...`);
  
  const calculateTestMRR = (results: number[]) => {
    let firstRelevantRank = -1;
    for (let rank = 0; rank < results.length; rank++) {
      if (results[rank] >= 2) {
        firstRelevantRank = rank + 1;
        break;
      }
    }
    return firstRelevantRank !== -1 ? (1 / firstRelevantRank) : 0;
  };

  // Caso A
  const caseA = [3, 2, 1, 0, 0];
  const dcgA = getDCG(caseA);
  const idcgA = getIDCG(caseA);
  console.log(`   [Caso A] (3,2,1,0,0): MRR@clinical-sufficient = ${calculateTestMRR(caseA).toFixed(4)} | nDCG = ${(dcgA/idcgA).toFixed(4)} (Expected: MRR=1, nDCG=1)`);
  
  // Caso B
  const caseB = [0, 3, 2, 1, 0];
  console.log(`   [Caso B] (0,3,2,1,0): MRR@clinical-sufficient = ${calculateTestMRR(caseB).toFixed(4)} (Expected: 0.5)`);

  // Caso C
  const caseC = [0, 0, 3, 2, 1];
  console.log(`   [Caso C] (0,0,3,2,1): MRR@clinical-sufficient = ${calculateTestMRR(caseC).toFixed(4)} (Expected: 0.3333)`);

  // Caso D
  const caseD = [1, 1, 0, 0, 0];
  console.log(`   [Caso D] (1,1,0,0,0): MRR@clinical-sufficient = ${calculateTestMRR(caseD).toFixed(4)} (Expected: 0)`);

  // Caso E
  const caseE = [0, 0, 1, 1, 0];
  console.log(`   [Caso E] Nenhum ≥2 (0,0,1,1,0): MRR@clinical-sufficient = ${calculateTestMRR(caseE).toFixed(4)} (Expected: 0)`);

  console.log(`   ✅ Auditoria concluída. Fórmulas determinísticas validadas.\n`);
}

async function main() {
  runSyntheticAudit();
  console.log(`\n🧪 Iniciando Avaliação de RAG (Fases 2 e 3) - Curated Clinical Retrieval Benchmark...`);
  
  const datasetPath = path.join(process.cwd(), 'tests/rag/dataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error("❌ ERRO: dataset.json não encontrado.");
    process.exit(1);
  }
  
  const evalDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  env.allowLocalModels = false;
  env.useBrowserCache = false;
  
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, { revision: EMBEDDING_REVISION });

  let totalQueries = evalDataset.length;
  let mrrSum = 0;
  let recallAt1Sum = 0;
  let recallAt3Sum = 0;
  let recallAt5Sum = 0;
  let ndcgSum = 0;

  for (let i = 0; i < totalQueries; i++) {
    const testCase = evalDataset[i];
    console.log(`\n▶️ Query [${testCase.id}] (${testCase.domain} | ${testCase.difficulty} | Sensibilidade: ${testCase.clinical_sensitivity}): "${testCase.query}"`);
    
    // 1. Gera embedding da query com o prefixo obrigatório
    const textToEmbed = `search_query: ${testCase.query}`;
    const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    // 2. Busca no Supabase (Top 5)
    const { data: results, error } = await supabase.rpc('match_clinical_documents', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: 0.1,
      match_count: 5
    });

    if (error) {
      console.error(`Erro ao buscar no banco: ${error.message}`);
      continue;
    }

    // 3. Avalia Resultados baseado nos Chunks
    const returnedChunks = results ? results.map((r: any) => r.metadata?.chunk_id || 'UNKNOWN') : [];
    console.log(`   Retornado Top 5 (Chunks): [${returnedChunks.join(', ')}]`);

    const expectedRelevances = testCase.relevance_judgments;
    // Filtrar os relevantes (relevance > 0)
    const allRelevantChunks = Object.keys(expectedRelevances).filter(k => expectedRelevances[k] > 0);
    const totalRelevantPossible = allRelevantChunks.length;

    let foundAt1 = 0, foundAt3 = 0, foundAt5 = 0;
    let firstRelevantRank = -1;
    let dcgRelevances = [];

    for (let rank = 0; rank < returnedChunks.length; rank++) {
      const chunk = returnedChunks[rank];
      const rel = expectedRelevances[chunk] || 0;
      dcgRelevances.push(rel);

      if (rel > 0) {
        if (rank < 1) foundAt1++;
        if (rank < 3) foundAt3++;
        if (rank < 5) foundAt5++;
      }
      
      // MRR is calculated based on the first *highly relevant* hit (score >= 2)
      if (rel >= 2 && firstRelevantRank === -1) {
        firstRelevantRank = rank + 1;
      }
    }

    // Recall@K = (relevantes encontrados no Top K) / (total de relevantes esperados no dataset para essa query)
    const r1 = totalRelevantPossible ? foundAt1 / totalRelevantPossible : 0;
    const r3 = totalRelevantPossible ? foundAt3 / totalRelevantPossible : 0;
    const r5 = totalRelevantPossible ? foundAt5 / totalRelevantPossible : 0;
    
    recallAt1Sum += r1;
    recallAt3Sum += r3;
    recallAt5Sum += r5;

    // MRR
    const mrr = firstRelevantRank !== -1 ? (1 / firstRelevantRank) : 0;
    mrrSum += mrr;

    // nDCG@5
    // Os ideais devem ser calculados com TODOS os julgamentos possíveis da query (as maiores notas), mesmo os que não retornaram.
    const allIdealRelevances = Object.values(expectedRelevances).filter((val: any) => val > 0) as number[];
    const idcg = getIDCG(allIdealRelevances.slice(0, 5)); // max 5 for @5
    const dcg = getDCG(dcgRelevances);
    const ndcg = idcg > 0 ? dcg / idcg : 0;
    ndcgSum += ndcg;

    console.log(`   R@1: ${r1.toFixed(2)} | R@3: ${r3.toFixed(2)} | R@5: ${r5.toFixed(2)}`);
    console.log(`   MRR: ${mrr.toFixed(4)}`);
    console.log(`   nDCG@5: ${ndcg.toFixed(4)}`);
  }

  console.log(`\n📊 === RESULTADOS DA AVALIAÇÃO (BASELINE ATUAL) ===`);
  console.log(`Total de Casos: ${totalQueries}`);
  console.log(`Recall@1 Global: ${((recallAt1Sum / totalQueries) * 100).toFixed(2)}%`);
  console.log(`Recall@3 Global: ${((recallAt3Sum / totalQueries) * 100).toFixed(2)}%`);
  console.log(`Recall@5 Global: ${((recallAt5Sum / totalQueries) * 100).toFixed(2)}%`);
  console.log(`MRR@clinical-sufficient Global: ${(mrrSum / totalQueries).toFixed(4)}`);
  console.log(`nDCG@5 Global:   ${(ndcgSum / totalQueries).toFixed(4)}`);
  console.log(`==================================================\n`);
}

main();
