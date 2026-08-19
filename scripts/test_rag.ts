import * as dotenv from 'dotenv';
import path from 'path';
import pc from 'picocolors';

// Setup environment variables before importing the service
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function testQuery(query: string, searchClinicalKnowledge: any) {
  console.log(pc.yellow(`\nPergunta: "${query}"`));
  
  try {
    console.log(pc.gray('Buscando (Híbrido + MMR + Force Risk)...'));
    // Busca até 6 resultados
    const results = await searchClinicalKnowledge(query, 6);

    if (!results || results.length === 0) {
      console.log(pc.red('❌ Nenhum resultado encontrado.'));
      return;
    }

    console.log(pc.green(`✅ Encontrados ${results.length} resultados:\n`));

    let riskFound = false;
    let types = new Set();

    results.forEach((result: any, index: number) => {
      const isRisk = result.risk_level === 'CRITICAL' || result.risk_level === 'HIGH';
      if (isRisk) riskFound = true;
      types.add(result.tipo_documento);

      const headerColor = isRisk ? pc.bgRed : pc.bgMagenta;
      console.log(headerColor(pc.white(` --- Resultado ${index + 1} (Score Híbrido: ${result.similarity.toFixed(4)}) --- `)));
      console.log(pc.bold('Doença:'), pc.white(result.disorder_name || 'N/A'));
      console.log(pc.bold('Categoria:'), pc.white(result.category || 'N/A'));
      console.log(pc.bold('Tipo Documento:'), pc.cyan(result.tipo_documento || 'N/A'));
      console.log(pc.bold('Intenção Clínica:'), pc.yellow(result.clinical_intent || 'N/A'));
      console.log(pc.bold('Risco:'), isRisk ? pc.red(result.risk_level) : pc.green(result.risk_level || 'LOW'));
      console.log(pc.bold('Conteúdo da Agulha (Chunk):'));
      console.log(pc.gray(result.chunk_content ? result.chunk_content.substring(0, 300) + '...' : 'Sem agulha, usando palheiro.'));
      console.log('\n');
    });

    console.log(pc.bold('Análise de Diversidade (MMR):'), pc.white(`${types.size} tipos de documentos diferentes recuperados.`));
    console.log(pc.bold('Análise de Segurança:'), riskFound ? pc.green('✅ Fator de risco recuperado com sucesso!') : pc.yellow('Nenhum risco de alta prioridade encontrado neste conjunto.'));

  } catch (error) {
    console.error(pc.red('❌ Erro ao executar a busca no RAG:'), error);
  }
}

async function testRAG() {
  console.log(pc.cyan('\n🔍 Iniciando Bateria de Testes do RAG Clínico Híbrido (v3)'));
  const { searchClinicalKnowledge } = await import('../services/ragService');

  // Teste 1: Intenção de Avaliação + Diversidade
  await testQuery('Como investigar ou avaliar insônia?', searchClinicalKnowledge);

  // Teste 2: Segurança (Force Retrieval) e Critérios
  await testQuery('Quais são os critérios diagnósticos para insônia?', searchClinicalKnowledge);
}

testRAG();
