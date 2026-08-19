/**
 * Script Offline para Alimentação da Base RAG (Mentis Clinical RAG)
 * 
 * Este script roda localmente na sua máquina (fora do servidor de produção).
 * Ele lê dados locais estruturados, gera embeddings diretamente na API do Gemini,
 * e salva os vetores no seu banco Supabase.
 * 
 * Como usar:
 * 1. Crie um arquivo .env na raiz do projeto (se não existir) com:
 *    VITE_SUPABASE_URL=sua_url_aqui
 *    VITE_SUPABASE_ANON_KEY=sua_chave_anonima_ou_service_role
 *    GEMINI_API_KEY=sua_chave_do_gemini
 * 
 * 2. Preencha o array `dadosParaInserir` (ou modifique para ler de um PDF/JSON).
 * 
 * 3. Execute o script no terminal:
 *    npx tsx scripts/seed_clinical_data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@huggingface/transformers';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente do .env local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Variáveis de ambiente faltando.");
  console.error("Certifique-se de que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão no .env");
  process.exit(1);
}

// Inicializa o cliente do banco
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações de Proveniência (Invariant do RAG)
const EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5';
const EMBEDDING_REVISION = 'main';
const EMBEDDING_DIMENSION = 768;
const EMBEDDING_TASK = 'search_document';

// ============================================================================
// DADOS PARA INGESTÃO
// ============================================================================
const dadosParaInserir = [
  {
    source: 'DSM-5-TR',
    code: 'F32',
    disorder_name: 'Episódio Depressivo Maior',
    category: 'criteria',
    metadata: { chunk_id: 'DSM-F32-CRIT', source_authority: 'primary', version: 'DSM-5-TR' },
    content: 'Cinco (ou mais) dos seguintes sintomas estiveram presentes durante o mesmo período de duas semanas e representam uma mudança em relação ao funcionamento anterior: pelo menos um dos sintomas é (1) humor deprimido ou (2) perda de interesse ou prazer.'
  },
  {
    source: 'DSM-5-TR',
    code: 'F31',
    disorder_name: 'Transtorno Bipolar',
    category: 'criteria',
    metadata: { chunk_id: 'DSM-F31-CRIT', source_authority: 'primary', version: 'DSM-5-TR' },
    content: 'Critérios para Episódio Maníaco: Um período distinto de humor anormal e persistentemente elevado, expansivo ou irritável e aumento anormal e persistente da atividade dirigida a objetivos ou da energia, durando pelo menos uma semana e presente na maior parte do dia, quase todos os dias.'
  },
  {
    source: 'DSM-5-TR',
    code: 'F41.0',
    disorder_name: 'Transtorno de Pânico',
    category: 'criteria',
    metadata: { chunk_id: 'DSM-F410-CRIT', source_authority: 'primary', version: 'DSM-5-TR' },
    content: 'Ataques de pânico inesperados e recorrentes. Um ataque de pânico é um surto abrupto de medo intenso ou desconforto intenso que alcança um pico em minutos, durante o qual ocorrem quatro (ou mais) dos seguintes sintomas: palpitações, sudorese, tremores, sensação de falta de ar, dor no peito, medo de morrer.'
  },
  {
    source: 'DSM-5-TR',
    code: 'F41.1',
    disorder_name: 'Transtorno de Ansiedade Generalizada (TAG)',
    category: 'criteria',
    metadata: { chunk_id: 'DSM-F411-CRIT', source_authority: 'primary', version: 'DSM-5-TR' },
    content: 'Ansiedade e preocupação excessivas (expectativa apreensiva), ocorrendo na maioria dos dias por pelo menos seis meses, com diversos eventos ou atividades. O indivíduo considera difícil controlar a preocupação.'
  },
  {
    source: 'DSM-5-TR',
    code: 'F40.0',
    disorder_name: 'Agorafobia',
    category: 'criteria',
    metadata: { chunk_id: 'DSM-F400-CRIT', source_authority: 'primary', version: 'DSM-5-TR' },
    content: 'Medo ou ansiedade acentuados acerca de duas (ou mais) das cinco situações seguintes: 1. Uso de transporte público. 2. Permanecer em espaços abertos. 3. Permanecer em locais fechados. 4. Permanecer em uma fila ou ficar em meio a uma multidão. 5. Sair de casa sozinho.'
  }
];

async function main() {
  console.log(`🚀 Inicializando o motor de IA Local (isso pode demorar na primeira vez para baixar os pesos)...`);
  
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, { revision: EMBEDDING_REVISION });
  console.log(`🚀 Motor carregado! Iniciando seeding para ${dadosParaInserir.length} registros...`);

  for (let i = 0; i < dadosParaInserir.length; i++) {
    const item = dadosParaInserir[i];
    console.log(`\n⏳ Processando [${i + 1}/${dadosParaInserir.length}]: ${item.source} - ${item.disorder_name || item.category}`);

    try {
      // 1. Gera o Embedding localmente
      const textToEmbed = `search_document: ${item.content}`;
      
      console.log(`   🧠 Gerando embedding vetorial local (${EMBEDDING_DIMENSION}d)...`);
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      const vetor = Array.from(output.data);
      
      if (!vetor || vetor.length === 0) throw new Error("Vetor não retornado.");

      // 2. Salva no banco de dados (Supabase) com Rastreabilidade
      console.log('   💾 Salvando no Supabase (pgvector)...');
      const { error } = await supabase
        .from('clinical_knowledge_base')
        .insert({
          source: item.source,
          code: item.code,
          disorder_name: item.disorder_name,
          category: item.category,
          content: item.content,
          metadata: item.metadata,
          embedding: `[${vetor.join(',')}]`,
          embedding_model: EMBEDDING_MODEL,
          embedding_model_revision: EMBEDDING_REVISION,
          embedding_dimension: EMBEDDING_DIMENSION,
          embedding_task: EMBEDDING_TASK
        });

      if (error) {
        console.error('   ❌ Erro ao inserir no banco:', error.message);
      } else {
        console.log('   ✅ Sucesso!');
      }

    } catch (err: any) {
      console.error('   ❌ Falha no processamento:', err.message);
    }
  }

  console.log('\n🎉 Processo concluído.');
}

main();
