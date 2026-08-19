import * as dotenv from 'dotenv';
import path from 'path';
import pc from 'picocolors';

// Setup environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const GOLDEN_SET = [
  {
    query: "Quais são os critérios diagnósticos para insônia?",
    expected_disorder: "Transtorno de Insônia",
    expected_intent: "Critério DSM",
    must_have_risk: false
  },
  {
    query: "Como avaliar um paciente com suspeita de transtorno borderline e risco de automutilação?",
    expected_disorder: "Transtorno da Personalidade Borderline",
    expected_intent: "Risco",
    must_have_risk: true
  }
];

function calculatePrecisionAtK(results: any[], k: number, expectedDisorder: string) {
  const topK = results.slice(0, k);
  let relevantCount = 0;
  for (const r of topK) {
    // Para simplificar, consideramos "relevante" se o nome do transtorno bater ou a busca recuperar algo útil do geral
    if (r.disorder_name && r.disorder_name.toLowerCase().includes(expectedDisorder.toLowerCase())) {
      relevantCount++;
    }
  }
  return relevantCount / k;
}

function calculateNDCG(results: any[], expectedDisorder: string) {
  let dcg = 0;
  let idcg = 0;
  for (let i = 0; i < results.length; i++) {
    // Relevance score: 3 (perfect match + risk if needed), 2 (disorder match), 0 (no match)
    let rel = 0;
    if (results[i].disorder_name && results[i].disorder_name.toLowerCase().includes(expectedDisorder.toLowerCase())) {
      rel = 2;
      if (results[i].tipo_documento === 'RiskChunk') rel = 3;
    }
    
    dcg += rel / Math.log2(i + 2); // i is 0-indexed, so log2(i+2) for position 1..N
    
    // Ideal DCG (assume top results should all be highly relevant)
    idcg += 3 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

async function testQuery(testCase: any, searchClinicalKnowledge: any) {
  console.log(pc.yellow(`\n[Benchmark] Pergunta: "${testCase.query}"`));
  
  try {
    const results = await searchClinicalKnowledge(testCase.query, 6);

    if (!results || results.length === 0) {
      console.log(pc.red('❌ Nenhum resultado encontrado.'));
      return;
    }

    let riskFound = false;
    let types = new Set();
    
    // Check Recall (is the expected intent/disorder in the top 6?)
    let recallStatus = false;

    results.forEach((result: any, index: number) => {
      const isRisk = result.risk_level === 'CRITICAL' || result.risk_level === 'HIGH';
      if (isRisk) riskFound = true;
      types.add(result.tipo_documento);
      
      if (result.disorder_name && result.disorder_name.toLowerCase().includes(testCase.expected_disorder.toLowerCase())) {
         recallStatus = true;
      }
    });

    const pAt3 = calculatePrecisionAtK(results, 3, testCase.expected_disorder);
    const ndcg = calculateNDCG(results, testCase.expected_disorder);

    console.log(pc.bold('Métricas de Qualidade (RAG v5):'));
    console.log(`- ${pc.white('Recall@6:')} ${recallStatus ? pc.green('✅ Atingido') : pc.red('❌ Falhou (Transtorno esperado não recuperado)')}`);
    console.log(`- ${pc.white('Precision@3:')} ${pc.cyan((pAt3 * 100).toFixed(1) + '%')}`);
    console.log(`- ${pc.white('NDCG:')} ${pc.cyan(ndcg.toFixed(3))}`);
    console.log(`- ${pc.white('Diversidade (MMR):')} ${pc.cyan(types.size + ' tipos de documentos')}`);
    console.log(`- ${pc.white('Segurança (Force Risk):')} ${testCase.must_have_risk ? (riskFound ? pc.green('✅ Risco injetado') : pc.red('❌ Risco Ausente!')) : pc.gray('N/A (Não crítico)')}`);

    // Exemplo de Knowledge Merge?
    const synth = results.find((r:any) => r.id.startsWith('synth-risk'));
    if (synth) {
      console.log(`- ${pc.bgGreen(pc.white(' Knowledge Merge Ativado '))} Chunk Sintetizado recuperado!`);
    }

  } catch (error) {
    console.error(pc.red('❌ Erro no Benchmark:'), error);
  }
}

async function runBenchmark() {
  console.log(pc.cyan('\n🏆 Iniciando Benchmark Clínico do RAG Híbrido (v5)'));
  console.log(pc.gray('Métricas: Precision@K, NDCG, Diversidade e Recall de Segurança.\n'));
  
  const { searchClinicalKnowledge } = await import('../services/ragService');

  for (const tc of GOLDEN_SET) {
    await testQuery(tc, searchClinicalKnowledge);
  }
  
  console.log(pc.magenta('\nNota sobre "Hallucinated Relations Rate":'));
  console.log(pc.gray('Esta métrica é medida estaticamente durante a Ingestão (mentis_cli.ts), onde o validador ontológico barra alucinações e loga a contagem de relações rejeitadas.'));
}

runBenchmark();
