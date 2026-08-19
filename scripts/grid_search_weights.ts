import * as dotenv from 'dotenv';
import path from 'path';
import pc from 'picocolors';
import { searchClinicalKnowledge, overrideAuthorityWeights } from '../services/ragService.ts';

// Configurações e Variáveis de Ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ----------------------------------------------------------------------------
// GOLDEN SET (CASOS SUJOS PARA EVITAR OVERFITTING)
// ----------------------------------------------------------------------------
const DIRTY_GOLDEN_SET = [
  {
    // Caso limpo
    query: "Paciente relata humor deprimido na maior parte do dia, perda de interesse, fadiga e pensamentos de morte recorrentes há 3 meses.",
    expected_disorder: "Transtorno Depressivo Maior",
    expected_intent: "Diagnóstico",
    must_have_risk: true
  },
  {
    // Comorbidade / Ruído (TDAH x Bipolar)
    query: "Ele é muito desatento e não consegue focar no trabalho, mas a esposa relata que há 2 semanas ele não dorme quase nada, gasta muito dinheiro e fala muito rápido. Antes ele era só desatento mesmo.",
    expected_disorder: "Transtorno Bipolar",
    expected_intent: "Diagnóstico diferencial",
    must_have_risk: false
  },
  {
    // Contradição Explicita
    query: "Paciente diz ter insônia severa e não consegue pegar no sono, mas a esposa relata que ele ronca alto, tem paradas respiratórias à noite e acorda cansado. Ele diz que dorme 8h mas não sente que descansa.",
    expected_disorder: "Apneia do Sono", // ou relacionado
    expected_intent: "Diagnóstico diferencial",
    must_have_risk: false
  },
  {
    // Risco Mascarado
    query: "Paciente de 19 anos, magra (IMC 16), diz que come muito e engorda fácil por isso corre 10km todo dia. Ela também corta os pulsos quando sente que comeu demais.",
    expected_disorder: "Anorexia Nervosa",
    expected_intent: "Risco",
    must_have_risk: true
  }
];

// ----------------------------------------------------------------------------
// FUNÇÕES DE MÉTRICA
// ----------------------------------------------------------------------------
function calculateNDCG(results: any[], expectedDisorder: string) {
  let dcg = 0;
  let idcg = 0;
  for (let i = 0; i < results.length; i++) {
    // Relevância
    let rel = 0;
    if (results[i].disorder_name && results[i].disorder_name.toLowerCase().includes(expectedDisorder.toLowerCase())) {
      rel = 2;
      if (results[i].tipo_documento === 'RiskChunk') rel = 3;
    }
    
    dcg += rel / Math.log2(i + 2);
    idcg += 3 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

// ----------------------------------------------------------------------------
// GRID SEARCH RUNNER
// ----------------------------------------------------------------------------
async function runGridSearch() {
  console.log(pc.magenta("\n=== INICIANDO GRID SEARCH DE PESOS DE AUTORIDADE ===\n"));
  console.log(pc.gray(`Executando ${DIRTY_GOLDEN_SET.length} casos testes ("sujos") para prevenir overfitting.\n`));

  // Permutações de teste
  const permutations = [
    { 'DSM-5-TR': 1.0, 'CID-11': 0.95, 'Protocolo TCC': 0.90, 'Outro': 0.85 }, // Padrão
    { 'DSM-5-TR': 1.0, 'CID-11': 1.0, 'Protocolo TCC': 0.95, 'Outro': 0.85 },  // Igualdade alta
    { 'DSM-5-TR': 0.90, 'CID-11': 0.90, 'Protocolo TCC': 1.0, 'Outro': 0.70 }, // Favorece intervenção
    { 'DSM-5-TR': 1.2, 'CID-11': 1.0, 'Protocolo TCC': 0.8, 'Outro': 0.5 },    // DSM Extremamente punitivo aos outros
  ];

  let bestScore = -1;
  let bestPermutation = null;

  for (let i = 0; i < permutations.length; i++) {
    const weights = permutations[i];
    console.log(pc.blue(`[Testando Permutação ${i + 1}]`));
    console.log(weights);

    overrideAuthorityWeights(weights);

    let totalNDCG = 0;
    
    for (const testCase of DIRTY_GOLDEN_SET) {
      try {
        const results = await searchClinicalKnowledge(testCase.query, 10);
        const ndcg = calculateNDCG(results, testCase.expected_disorder);
        totalNDCG += ndcg;
      } catch (err: any) {
        console.log(pc.red(`Erro ao consultar DB: ${err.message}`));
      }
    }

    const avgNDCG = totalNDCG / DIRTY_GOLDEN_SET.length;
    console.log(`Score NDCG Médio: ${pc.bold(avgNDCG.toFixed(4))}\n`);

    if (avgNDCG > bestScore) {
      bestScore = avgNDCG;
      bestPermutation = weights;
    }
  }

  console.log(pc.green(`\n=== GRID SEARCH CONCLUÍDO ===`));
  console.log(`Melhor Score NDCG: ${pc.bold(bestScore.toFixed(4))}`);
  console.log(`Pesos Ideais recomendados para Produção:`);
  console.log(bestPermutation);
}

// Execução
runGridSearch().catch(console.error);
