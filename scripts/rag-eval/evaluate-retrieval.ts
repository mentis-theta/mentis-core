import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pc from 'picocolors';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(pc.red("❌ ERRO: Variáveis de ambiente Supabase faltando."));
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const EXPECTED_EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '768');
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed';
const SOURCE_VERSION = 1;
const TOP_K = 10;

interface GoldCase {
  id: string;
  question: string;
  source: string;
  category: string;
  expected_behavior: string;
  expected: {
    section?: string;
    subsection?: string;
    criterion_path?: string | null;
    relevance: number;
  }[];
}

function calculateDCG(relevances: number[]) {
  return relevances.reduce((acc, rel, i) => acc + (Math.pow(2, rel) - 1) / Math.log2(i + 2), 0);
}

function calculateNDCG(relevances: number[], k: number) {
  const dcg = calculateDCG(relevances.slice(0, k));
  const idealRelevances = [...relevances].sort((a, b) => b - a).slice(0, k);
  const idcg = calculateDCG(idealRelevances);
  return idcg === 0 ? 0 : dcg / idcg;
}

async function getEmbedding(text: string) {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { action: 'embed_content', payload: { contents: text } }
  });
  if (error) throw error;
  return data.embeddings[0].values;
}

async function runEvaluation() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const goldPath = path.join(__dirname, 'dataset', 'retrieval_gold.json');
  if (!fs.existsSync(goldPath)) {
    console.error(pc.red('Gold set não encontrado.'));
    return;
  }

  const cases: GoldCase[] = JSON.parse(fs.readFileSync(goldPath, 'utf-8'));
  const evaluationId = `RAG-EVAL-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;

  // 1. Sanity Check - Verify ACTIVE ingestion exists
  const { data: ingestions, error: ingErr } = await supabase.from('clinical_rag_ingestions')
    .select('id, total_chunks, embedding_dimensions')
    .eq('status', 'ACTIVE')
    .eq('source', 'DSM-5-TR')
    .eq('source_version', SOURCE_VERSION);

  if (ingErr || !ingestions || ingestions.length === 0) {
    console.log(pc.yellow(`\n⚠ EVALUATION NOT VALID\n`));
    console.log(pc.gray(`Active ingestion: NONE`));
    console.log(pc.gray(`Evaluable chunks: 0`));
    console.log(pc.gray(`Evaluated queries: 0\n`));
    console.log(pc.white(`Metrics:`));
    console.log(pc.gray(`Recall@1  N/A`));
    console.log(pc.gray(`Recall@3  N/A`));
    console.log(pc.gray(`Recall@5  N/A`));
    console.log(pc.gray(`Recall@10 N/A`));
    console.log(pc.gray(`MRR       N/A`));
    console.log(pc.gray(`nDCG@10   N/A\n`));
    console.log(pc.red(`Reason: No ACTIVE ingestion available for DSM-5-TR v${SOURCE_VERSION}. Run mentis_cli.ts first.\n`));
    return;
  }
  const activeIngestionId = ingestions[0].id;
  const evaluableChunks = ingestions[0].total_chunks;

  console.log(pc.magenta(`══════════════════════════════════════`));
  console.log(pc.white(pc.bold(` MENTIS RAG EVALUATION - RETRIEVAL`)));
  console.log(pc.gray(` Eval ID:   ${evaluationId}`));
  console.log(pc.gray(` Dataset:   DSM-5-TR v${SOURCE_VERSION}`));
  console.log(pc.gray(` Model:     ${EMBEDDING_MODEL} (${EXPECTED_EMBEDDING_DIMENSIONS}d)`));
  console.log(pc.gray(` Ingestion: ${activeIngestionId}`));
  console.log(pc.gray(` Chunks:    ${evaluableChunks}`));
  console.log(pc.gray(` Top K:     ${TOP_K}`));
  console.log(pc.gray(` Cases:     ${cases.length}`));
  console.log(pc.magenta(`══════════════════════════════════════\n`));

  let totalRecall1 = 0;
  let totalRecall3 = 0;
  let totalRecall5 = 0;
  let totalRecall10 = 0;
  let totalMrr = 0;
  let totalNdcg = 0;
  let validRetrievalCases = 0;
  let coveredCases = 0;

  for (const c of cases) {
    if (c.expected_behavior === 'abstain') continue; 
    validRetrievalCases++;

    // Calculate Coverage
    let questionCovered = false;
    for (const exp of c.expected) {
       let query = supabase.from('clinical_knowledge_chunks')
         .select('id', { count: 'exact', head: true })
         .eq('ingestion_id', activeIngestionId);
       if (exp.section) query = query.eq('section', exp.section);
       if (exp.subsection) query = query.eq('subsection', exp.subsection);
       if (exp.criterion_path !== undefined) {
         if (exp.criterion_path === null) query = query.is('criterion_path', null);
         else query = query.eq('criterion_path', exp.criterion_path);
       }
       const { count, error } = await query;
       if (count && count > 0) {
         questionCovered = true; 
         break;
       }
    }
    if (questionCovered) coveredCases++;

    const vec = await getEmbedding(c.question);
    
    // We fetch raw similarity using match_clinical_knowledge_docs_v2
    const { data: matches, error: rpcErr } = await supabase.rpc('match_clinical_knowledge_docs_v2', {
      query_embedding: vec,
      match_threshold: 0.0,
      match_count: TOP_K
    });

    if (rpcErr) {
      console.error(pc.red(`RPC Error: ${rpcErr.message}`));
      continue;
    }

    // We need to fetch the exact structural fields (section, subsection, criterion_path) 
    // because the RPC might not map them perfectly yet.
    const chunkIds = matches.map((m: any) => m.id);
    const { data: chunksData } = await supabase.from('clinical_knowledge_chunks')
      .select('id, section, subsection, criterion_path, ingestion_id')
      .in('id', chunkIds);

    const relevances = matches.map((m: any, idx: number) => {
      const dbChunk = chunksData?.find(d => d.id === m.id);
      if (!dbChunk || dbChunk.ingestion_id !== activeIngestionId) return 0;

      let bestScore = 0;
      for (const exp of c.expected) {
        let match = true;
        if (exp.section && dbChunk.section !== exp.section) match = false;
        if (exp.subsection && dbChunk.subsection !== exp.subsection) match = false;
        if (exp.criterion_path !== undefined && dbChunk.criterion_path !== exp.criterion_path) match = false;

        if (match && exp.relevance > bestScore) {
          bestScore = exp.relevance;
        }
      }
      return bestScore;
    });

    // Recall: Did we get at least one highly relevant document (relevance >= 2)?
    const isRel = (r: number) => r >= 2;
    const r1 = isRel(relevances[0]) ? 1 : 0;
    const r3 = relevances.slice(0, 3).some(isRel) ? 1 : 0;
    const r5 = relevances.slice(0, 5).some(isRel) ? 1 : 0;
    const r10 = relevances.slice(0, 10).some(isRel) ? 1 : 0;

    const firstRelIdx = relevances.findIndex(isRel);
    const mrr = firstRelIdx === -1 ? 0 : 1 / (firstRelIdx + 1);
    
    const ndcg = calculateNDCG(relevances, TOP_K);

    totalRecall1 += r1;
    totalRecall3 += r3;
    totalRecall5 += r5;
    totalRecall10 += r10;
    totalMrr += mrr;
    totalNdcg += ndcg;
    
    console.log(pc.cyan(`Q: ${c.question}`));
    console.log(pc.gray(`   MRR: ${mrr.toFixed(2)} | nDCG@10: ${ndcg.toFixed(2)}`));
    console.log(pc.gray(`   Top 3 scores: [${relevances.slice(0,3).join(', ')}]`));
    console.log();
  }

  if (validRetrievalCases > 0) {
    console.log(pc.magenta(`══════════════════════════════════════`));
    console.log(pc.white(` RETRIEVAL METRICS (Avg over ${validRetrievalCases} cases)`));
    console.log(pc.magenta(`══════════════════════════════════════`));
    console.log(` Gold Coverage: ${((coveredCases / validRetrievalCases) * 100).toFixed(1)}% (${coveredCases}/${validRetrievalCases})\n`);
    console.log(` Recall@1:    ${(totalRecall1 / validRetrievalCases).toFixed(2)}`);
    console.log(` Recall@3:    ${(totalRecall3 / validRetrievalCases).toFixed(2)}`);
    console.log(` Recall@5:    ${(totalRecall5 / validRetrievalCases).toFixed(2)}`);
    console.log(` Recall@10:   ${(totalRecall10 / validRetrievalCases).toFixed(2)}\n`);
    console.log(` MRR:         ${(totalMrr / validRetrievalCases).toFixed(2)}`);
    console.log(` nDCG@10:     ${(totalNdcg / validRetrievalCases).toFixed(2)}`);
    console.log(pc.magenta(`══════════════════════════════════════\n`));
  } else {
    console.log(pc.yellow('Nenhum caso de retrieval válido encontrado.'));
  }
}

runEvaluation().catch(console.error);
