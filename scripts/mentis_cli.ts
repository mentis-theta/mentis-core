import { intro, outro, select, text, spinner, isCancel, cancel, note, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { CircuitBreaker, ConcurrencyLimiter, withRetry } from './lib/resilience';
import { CacheSignatureParams, generateProcessingSignature, isReusableCachedChunk } from './lib/cache';

const globalLimiter = new ConcurrencyLimiter(1);
const llmBreaker = new CircuitBreaker('gemini', 5, 30000, 300000);
const embeddingBreaker = new CircuitBreaker('nomic-embed', 5, 30000, 300000);
const supabaseBreaker = new CircuitBreaker('supabase', 5, 30000, 300000);

import { NoopPIIDetector } from './lib/pii';
import { validateClinicalFactSafety } from './lib/validator';

const PIPELINE_VERSIONS = Object.freeze({
  ingestion_version: "release-001",
  chunker_version: "v1.0",
  normalization_version: "v1.0",
  extraction_model: "gemini-3.5-flash",
  extraction_temperature: 0.1,
  prompt_version: "v1.0",
  kg_schema_version: "v1.0",
  embedding_model: process.env.EMBEDDING_MODEL || "nomic-embed",
  embedding_dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "768")
});

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SOURCE_VERSION = 1;

const isDryRun = process.argv.includes('--dry-run');
const canaryIdx = process.argv.indexOf('--canary');
const isCanary = canaryIdx !== -1;
const canaryLimit = isCanary && process.argv[canaryIdx + 1] ? parseInt(process.argv[canaryIdx + 1]) : 10;
const canaryDiverse = isCanary && process.argv.includes('--strategy=diverse');

if (!supabaseUrl || !supabaseKey) {
  console.error(pc.red("❌ ERRO: Variáveis de ambiente Supabase faltando."));
  process.exit(1);
}

const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error(pc.red("❌ ERRO: Variável VITE_GEMINI_API_KEY faltando."));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const INGESTION_ID = crypto.randomUUID();

interface ParentDocument {
  id: string;
  source: string;
  code: string;
  disorder_name: string;
  full_content: string;
  source_version: number;
  ingestion_id: string;
  ingestion_status: string;
  content_hash: string;
}

export interface ChildChunk {
  id: string;
  document_id: string;
  source_version: number;
  category: string;
  content: string;
  disorder_name: string;
  tipo_documento: string;
  clinical_intent: string;
  risk_level: string;
  chunk_type: string;
  chapter: string;
  section: string;
  subsection: string;
  criterion: string | null;
  criterion_path: string | null;
  table_id: string | null;
  table_part: number | null;
  table_total_parts: number | null;
  embedding_model: string;
  embedding_dimensions: number;
  content_hash: string;
  ingestion_id: string;
  ingestion_status: string;
  metadata: Record<string, any>; 
}

// ----------------------------------------------------------------------------
// ONTOLOGY & EVIDENCE VALIDATION
// ----------------------------------------------------------------------------
const VALID_RELATION_TYPES = [
  'symptom_of', 'risk_factor_for', 'treats', 'contraindicated_for',
  'predisposes_to', 'precipitates', 'perpetuates', 'protects_against'
];

export function isWordBoundary(str: string, index: number) {
  if (index <= 0 || index >= str.length) return true;
  const isAlphaNum = (c: string) => /^[a-z0-9à-ÿ]$/i.test(c);
  return !isAlphaNum(str[index - 1]) || !isAlphaNum(str[index]);
}

export function isValidLexicalBoundary(str: string, start: number, end: number) {
  return isWordBoundary(str, start) && isWordBoundary(str, end);
}

export function validateCandidateEvidence(quote: string, chunkText: string, chunkId: string) {
  if (!quote || !chunkText) return null;

  // 1. EXACT MATCH
  let idx = chunkText.indexOf(quote);
  if (idx !== -1 && isValidLexicalBoundary(chunkText, idx, idx + quote.length)) {
    return {
      quote,
      chunk_id: chunkId,
      start: idx,
      end: idx + quote.length,
      match_type: 'exact'
    };
  }

  // 2. NORMALIZED EXACT MATCH (Ignore excess spaces & casing)
  // To avoid breaking offsets, we only normalize for the check. But since we need offsets, 
  // we do a regex based normalized match.
  const escapedQuote = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // allow any whitespace between words
  const regexStr = escapedQuote.split(/\s+/).join('\\s+');
  try {
    const regex = new RegExp(regexStr, 'i');
    const match = chunkText.match(regex);
    if (match && match.index !== undefined) {
      const endIdx = match.index + match[0].length;
      if (isValidLexicalBoundary(chunkText, match.index, endIdx)) {
        return {
          quote: match[0], // actual quote in text
          chunk_id: chunkId,
          start: match.index,
          end: endIdx,
          match_type: 'normalized_exact'
        };
      }
    }
  } catch(e) {}

  // 3. REJECT (No fuzzy bag of words allowed!)
  return null;
}

function validateRelations(relations: any[], chunkText: string, chunkId: string) {
  if (!Array.isArray(relations)) return [];
  const validRelations: any[] = [];
  for (const rel of relations) {
    if (!rel.relation_type || !VALID_RELATION_TYPES.includes(rel.relation_type)) continue;
    
    const quote = rel.evidence?.quote || rel.evidence_quote;
    if (!quote || typeof quote !== 'string') continue;

    const validatedEvidence = validateCandidateEvidence(quote, chunkText, chunkId);
    if (validatedEvidence) {
      rel.evidence = validatedEvidence; 
      validRelations.push(rel);
    }
  }
  return validRelations;
}

// ----------------------------------------------------------------------------
// DETERMINISTIC EXTRACTION
// ----------------------------------------------------------------------------
export function isClinicalHeader(rawHeader: string) {
  const lowerHeader = rawHeader.toLowerCase();
  const genericRadicals = [
    'especifique', 'nota de', 'risco', 'diagnóstic', 
    'comorbidade', 'marcador', 'critério', 'diferencia',
    'prevalênc', 'desenvolvimento e curso', 'cultura',
    'gênero', 'consequência', 'característica'
  ];
  return genericRadicals.some(radical => lowerHeader.includes(radical));
}

// ----------------------------------------------------------------------------
// SEMANTIC EXTRACTION (LLM) WITH RETRY
// ----------------------------------------------------------------------------
async function extractKnowledgeGraph(text: string, category: string, disorderName: string, chunkId: string): Promise<any> {
  const prompt = `Extraia o Knowledge Graph Clínico.
Transtorno: "${disorderName}" | Seção: "${category}".
Use APENAS estes relation_type: ${VALID_RELATION_TYPES.join(', ')}.

Para cada relação, forneça "evidence" com APENAS a "quote" EXATA e LITERAL do texto. Não parafraseie.
{ "quote": "frase exata do texto que comprova" }

CUIDADO: Se houver aspas (") dentro da citação original, você DEVE escapá-las no JSON (ex: \\"palavra\\"). Retorne APENAS JSON puro, sem blocos de markdown.

Responda APENAS em JSON válido no formato:
{
  "clinical_intent": "Diagnóstico | Tratamento | Risco | Avaliação inicial | Etiologia | Diagnóstico diferencial",
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "entities": [ { "name": "...", "type": "Symptom | Treatment | Disorder | Factor | Medication | Concept" } ],
  "relations": [ { "source_entity": "...", "relation_type": "...", "target_entity": "...", "evidence": { "quote": "..." } } ]
}

Texto:
${text}`;

  let jsonResult: any = null;
  let outputRepairs = 0;
  const MAX_REPAIRS = 1;

  while (outputRepairs <= MAX_REPAIRS) {
    try {
      const resultText = await globalLimiter.acquire().then(() =>
        withRetry(
          'extractKnowledgeGraph',
          'gemini',
          llmBreaker,
          6,
          2000,
          async () => {
            try {
              const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.1
                }
              });
              let rawText = response.text || '{}';
              // Throttling for Free Tier (15 RPM = 4s/req)
              await new Promise(r => setTimeout(r, 4500));
              return rawText.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
            } finally {
              globalLimiter.release();
            }
          }
        )
      );

      jsonResult = JSON.parse(resultText);
      
      // Structural validation
      if (!jsonResult || typeof jsonResult !== 'object') throw new Error('Schema: root is not an object');
      if (!jsonResult.entities || !Array.isArray(jsonResult.entities)) throw new Error('Schema: entities missing or not array');
      if (!jsonResult.relations || !Array.isArray(jsonResult.relations)) throw new Error('Schema: relations missing or not array');

      // Success!
      jsonResult._repair_triggered = outputRepairs > 0;
      jsonResult._repair_success = outputRepairs > 0;
      return jsonResult;
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || '';
      
      // If it's a JSON/Schema error, attempt Output Repair WITHOUT hitting the network circuit breaker
      if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('schema')) {
        outputRepairs++;
        if (outputRepairs > MAX_REPAIRS) {
          return { _failed: true, error_code: `Syntax/Schema irrecoverable: ${error.message}`, chunk_id: chunkId, _repair_triggered: true, _repair_success: false };
        }
        console.log(JSON.stringify({ event: 'output_repair', attempt: outputRepairs, chunk_id: chunkId }));
        continue; // loop again
      }
      
      // If it's auth or a hard error propagated from withRetry
      return { _failed: true, error_code: `Hard Failure: ${error.message}`, chunk_id: chunkId };
    }
  }
}

// ----------------------------------------------------------------------------
// STRUCTURAL CHUNKER
// ----------------------------------------------------------------------------
export function chunkTable(tableText: string, tableId: string, maxLen = 1500): {text: string, type: string, table_id: string, table_part: number, table_total_parts: number}[] {
  const lines = tableText.trim().split('\n');
  if (lines.length < 3 || tableText.length <= maxLen) {
    return [{ text: tableText, type: 'table', table_id: tableId, table_part: 1, table_total_parts: 1 }];
  }
  
  const header = lines.slice(0, 2).join('\n'); 
  const rawParts: string[] = [];
  let currentChunkLines = [header];
  let currentLen = header.length;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (currentLen + line.length > maxLen && currentChunkLines.length > 2) {
      rawParts.push(currentChunkLines.join('\n'));
      currentChunkLines = [header, line];
      currentLen = header.length + line.length + 1;
    } else {
      currentChunkLines.push(line);
      currentLen += line.length + 1;
    }
  }
  if (currentChunkLines.length > 2) rawParts.push(currentChunkLines.join('\n'));
  
  return rawParts.map((text, idx) => ({
    text,
    type: 'table_part',
    table_id: tableId,
    table_part: idx + 1,
    table_total_parts: rawParts.length
  }));
}

export function structuralChunking(text: string, maxLen = 1500) {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  const chunks: any[] = [];
  
  let currentBlock = '';
  let currentType = 'prose';
  let currentCriterion: string | null = null;
  let tableCounter = 1;

  const pushBlock = () => {
    if (currentBlock.length > 0) {
      if (currentType === 'table') {
        const tChunks = chunkTable(currentBlock, `tbl_${tableCounter++}`, maxLen);
        chunks.push(...tChunks.map(c => ({...c, criterion_path: currentCriterion})));
      } else if (currentBlock.length > maxLen) {
        let start = 0;
        while (start < currentBlock.length) {
          let end = start + maxLen;
          if (end >= currentBlock.length) {
            chunks.push({ text: currentBlock.substring(start), type: currentType, criterion_path: currentCriterion });
            break;
          }
          let lastPeriod = currentBlock.lastIndexOf('. ', end);
          if (lastPeriod > start + (maxLen / 2)) end = lastPeriod + 1;
          chunks.push({ text: currentBlock.substring(start, end).trim(), type: currentType, criterion_path: currentCriterion });
          start = end;
        }
      } else {
        chunks.push({ text: currentBlock, type: currentType, criterion_path: currentCriterion });
      }
      currentBlock = '';
    }
  };

  for (const para of paragraphs) {
    const isTable = para.split('\n').some(l => l.trim().startsWith('|'));
    const criterionMatch = para.match(/^([A-Z])\.\s/);
    
    if (isTable) {
      pushBlock();
      currentBlock = para;
      currentType = 'table';
      pushBlock();
      currentType = 'prose';
      continue;
    }

    if (criterionMatch) {
      pushBlock();
      currentCriterion = criterionMatch[1];
      currentBlock = para;
      currentType = 'diagnostic_criterion';
      continue;
    }

    if (currentBlock.length + para.length + 2 > maxLen) pushBlock();
    currentBlock += (currentBlock ? '\n\n' : '') + para;
  }
  pushBlock();

  return chunks;
}

// ----------------------------------------------------------------------------
// HASH & EMBEDDING UTILS
// ----------------------------------------------------------------------------
const fetchEmbeddingWithRetry = async (content: string): Promise<number[]> => {
  return globalLimiter.acquire().then(() =>
    withRetry(
      'embed_content',
      'nomic-embed',
      embeddingBreaker,
      6,
      2000,
      async () => {
        try {
          const { data, error: embedError } = await supabase.functions.invoke('ai-proxy', {
            body: { action: 'embed_content', payload: { contents: content } }
          });
          if (embedError) {
            const err = new Error(`Edge Error: ${embedError.message}`);
            (err as any).status = embedError.status || 500;
            throw err;
          }
          if (!data?.embeddings?.[0]?.values) throw new Error("Vetor vazio retornado");
          const vec = data.embeddings[0].values;
          if (vec.length !== PIPELINE_VERSIONS.embedding_dimensions) throw new Error(`Dimensão errada: ${vec.length} != ${PIPELINE_VERSIONS.embedding_dimensions}`);
          return vec;
        } finally {
          globalLimiter.release();
        }
      }
    )
  );
};

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.clear();
  intro(pc.bgMagenta(pc.white(pc.bold(' 🐭 Mentis CLI v6 [PRODUÇÃO] '))) + pc.magenta(' All-or-nothing Ingestion'));

  try {
    const { error: testErr } = await supabase.from('clinical_knowledge_docs').select('id').limit(1);
    if (testErr) throw testErr;
  } catch (err) {
    cancel(`❌ Falha ao conectar com o banco. O Schema está atualizado? ${err}`);
    process.exit(1);
  }

  const docsPath = path.resolve(process.cwd(), 'clinical_docs');
  if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath);

  let allFiles = fs.readdirSync(docsPath).filter(f => (f.endsWith('.md') || f.endsWith('.txt')) && f !== 'README.md');
  if (allFiles.length === 0) {
    cancel('Nenhum arquivo na pasta clinical_docs.');
    process.exit(0);
  }

  let selectedFile: string | symbol = allFiles.find(f => f.includes('DSM-5')) || allFiles[0];
  let authorityProfile = 'DSM-5-TR';
  let chapterName = 'Manual Completo';

  if (!isDryRun && !isCanary) {
    selectedFile = await select({
      message: pc.magenta('Qual documento ingerir?'),
      options: allFiles.map(file => ({ value: file, label: file })),
    });
    if (isCancel(selectedFile)) process.exit(0);

    const source = await select({
      message: pc.magenta('Qual a Fonte (Authority Profile)?'),
      options: [{ value: 'DSM-5-TR', label: 'DSM-5-TR' }, { value: 'CID-11', label: 'CID-11' }, { value: 'Outro', label: 'Outro' }]
    });
    if (isCancel(source)) process.exit(0);
    authorityProfile = source as string;
    if (authorityProfile === 'Outro') authorityProfile = await text({ message: 'Digite a fonte:' }) as string;

    const chapterRes = await text({ message: pc.magenta('Qual o Capítulo atual (ex: Transtornos do Neurodesenvolvimento)?') });
    if (isCancel(chapterRes)) process.exit(0);
    chapterName = chapterRes as string;
  }

  // Registro da Ingestão no BD
  const sIngest = spinner();
  sIngest.start(pc.magenta(`📝 Iniciando registro da ingestão...`));
  const { error: ingestErr } = await supabase.from('clinical_rag_ingestions').insert({
    id: INGESTION_ID,
    source: authorityProfile,
    source_version: SOURCE_VERSION,
    status: 'PROCESSING',
    embedding_model: PIPELINE_VERSIONS.embedding_model,
    embedding_dimensions: PIPELINE_VERSIONS.embedding_dimensions
  });
  if (ingestErr) {
    cancel(`❌ Falha ao registrar ingestão: ${ingestErr.message}`);
    process.exit(1);
  }
  sIngest.stop(pc.green(`✅ Ingestão ID ${INGESTION_ID} registrada como PROCESSING.`));

  let rawFileContent = fs.readFileSync(path.join(docsPath, selectedFile as string), 'utf-8');
  rawFileContent = rawFileContent.replace(/\r\n/g, '\n');
  const lines = rawFileContent.split('\n');

  const parents: Map<string, ParentDocument> = new Map();
  let rawChunks: any[] = [];
  
  let currentH2 = 'Desconhecido';
  let currentH3 = 'Geral';
  let currentSectionText = '';
  
  const processAndPushSection = () => {
    if (currentSectionText.trim().length === 0) return;
    const structuralChunks = structuralChunking(currentSectionText);
    for (const c of structuralChunks) {
      rawChunks.push({ ...c, h2: currentH2, h3: currentH3 });
    }
    currentSectionText = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const textStr = lines[i];
    
    if (authorityProfile === 'DSM-5-TR' && i < 500) {
      if (textStr.includes('## Transtorno do Desenvolvimento Intelectual')) {
      } else if (currentH2 === 'Desconhecido' && currentSectionText.length === 0) {
      }
    }

    const isHeader2 = textStr.startsWith('## ') && !textStr.startsWith('###');
    const isHeader3 = textStr.startsWith('### ') && !textStr.startsWith('####');

    if (isHeader2) {
      processAndPushSection();
      const rawHeader = textStr.replace(/^##\s*/, '').trim();
      const isTrashH2 = /^\d+$/.test(rawHeader) || rawHeader.toLowerCase().includes('trabalhador');
      if (!isTrashH2) {
        if (isClinicalHeader(rawHeader)) {
          currentH3 = rawHeader; 
        } else {
          currentH2 = rawHeader; 
          currentH3 = 'Geral';
        }
        continue;
      }
    } else if (isHeader3) {
      processAndPushSection();
      currentH3 = textStr.replace(/^###\s*/, '').trim();
      continue;
    }

    currentSectionText += (currentSectionText.length > 0 ? '\n' : '') + textStr;
  }
  processAndPushSection();
  
  if (isCanary) {
    // Aplica amostragem se for canary strategy=diverse
    if (canaryDiverse && rawChunks.length >= 10) {
      const sampled = [];
      // 3 início
      sampled.push(rawChunks[0], rawChunks[1], rawChunks[2]);
      // 3 meio
      const mid = Math.floor(rawChunks.length / 2);
      sampled.push(rawChunks[mid - 1], rawChunks[mid], rawChunks[mid + 1]);
      // 3 fim
      const end = rawChunks.length - 1;
      sampled.push(rawChunks[end - 2], rawChunks[end - 1], rawChunks[end]);
      // 1 "aleatório" (determinístico em 1/3)
      sampled.push(rawChunks[Math.floor(rawChunks.length / 3)]);
      rawChunks = sampled.slice(0, canaryLimit);

    } else if (rawChunks.length > canaryLimit) {
      rawChunks = rawChunks.slice(0, canaryLimit);
    }
    console.log(pc.yellow(`⚠️ CANARY MODE: Reduzido para ${rawChunks.length} chunks.`));
  }

  if (rawChunks.length === 0) {
    await supabase.from('clinical_rag_ingestions').update({ status: 'FAILED', error_summary: 'Arquivo vazio', completed_at: new Date() }).eq('id', INGESTION_ID);
    cancel('O arquivo estava vazio ou o TOC não foi ultrapassado.');
    process.exit(0);
  }

  for (const c of rawChunks) {
    if (!parents.has(c.h2)) {
      const fullText = rawChunks.filter(x => x.h2 === c.h2).map(x => x.text).join('\n\n');
      const hash = crypto.createHash('sha256').update(`${fullText}|${authorityProfile}|${SOURCE_VERSION}|${chapterName}|${c.h2}`).digest('hex');
      parents.set(c.h2, {
        id: crypto.randomUUID(),
        source: authorityProfile,
        code: '',
        disorder_name: c.h2,
        full_content: fullText,
        source_version: SOURCE_VERSION,
        ingestion_id: INGESTION_ID,
        ingestion_status: 'PENDING',
        content_hash: hash
      });
    }
  }

  // --- 2. Preparar PII Detector ---
  const piiDetector = new NoopPIIDetector();

  // Pre-calculate signatures and cache params for children
  for (const chunk of rawChunks) {
    const piiResult = piiDetector.detect(chunk.text);
    if (piiResult.detected) {
      // Stub para o futuro
    }
    
    const provenancePrefix = `[SOURCE]\n${authorityProfile} v${SOURCE_VERSION}\n[CHAPTER]\n${chapterName}\n[SECTION]\n${chunk.h2}\n[SUBSECTION]\n${chunk.h3}\n${chunk.criterion_path ? `[CRITERION]\n${chunk.criterion_path}\n` : ''}[CHUNK]\n`;
    chunk.fullContent = provenancePrefix + chunk.text;
    
    chunk.cacheParams = {
      normalized_content: chunk.text,
      provenance: provenancePrefix,
      source_version: SOURCE_VERSION,
      chunker_version: PIPELINE_VERSIONS.chunker_version,
      prompt_version: PIPELINE_VERSIONS.prompt_version,
      kg_schema_version: PIPELINE_VERSIONS.kg_schema_version,
      normalization_version: PIPELINE_VERSIONS.normalization_version,
      extraction_model: PIPELINE_VERSIONS.extraction_model,
      extraction_temperature: PIPELINE_VERSIONS.extraction_temperature,
      embedding_model: PIPELINE_VERSIONS.embedding_model,
      dimensions: PIPELINE_VERSIONS.embedding_dimensions
    };
    chunk.processing_signature = generateProcessingSignature(chunk.cacheParams);
  }

  const s = spinner();
  s.start(pc.magenta(`🔍 Buscando cache de hashes no Supabase...`));
  const cachedChunksMap = new Map<string, any>();
  const allHashes = rawChunks.map(c => c.processing_signature);
  
  for (let i = 0; i < allHashes.length; i += 200) {
    const hashBatch = allHashes.slice(i, i + 200);
    const { data: cached } = await withRetry('cache_lookup', 'supabase', supabaseBreaker, 3, 1000, async () => {
      const res = await supabase.from('clinical_knowledge_chunks')
        .select('content_hash, embedding, embedding_dimensions, source_version, metadata')
        .in('content_hash', hashBatch)
        .eq('ingestion_status', 'ACTIVE');
      if (res.error) throw res.error;
      return res;
    });
    if (cached) {
      for (const row of cached) cachedChunksMap.set(row.content_hash, row);
    }
  }
  if (isDryRun) {
    s.stop(pc.yellow(`⚠️  DRY-RUN MODE ACTIVATE: Conectividade Supabase Validada.`));
  } else {
    s.stop(pc.green(`✅ Conectividade Supabase Validada.`));
  }

  if (isDryRun) {
    console.log(pc.yellow(`\n📊 [DRY-RUN ESTIMATE]`));
    console.log(pc.cyan(`\nAssinatura de Processamento (PIPELINE_VERSIONS):`));
    console.log(JSON.stringify(PIPELINE_VERSIONS, null, 2));
    
    console.log(pc.cyan(`\nEstimativas de Carga:`));
    console.log(`Documentos a gerar: ${parents.size}`);
    console.log(`Chunks estruturais: ${rawChunks.length}`);
    console.log(`Cache Hits Estimados: ${cachedChunksMap.size}`);
    console.log(`Chamadas LLM Estimadas: ${rawChunks.length - cachedChunksMap.size}`);
    const estimatedTokens = (rawChunks.length - cachedChunksMap.size) * 1500;
    console.log(`Tokens LLM Estimados: ~${estimatedTokens}`);
    console.log(`Custo Estimado (Gemini 3.5 Flash Free): $0.00`);
    console.log(pc.yellow(`\nDRY-RUN finalizado. Nenhuma escrita foi realizada.`));
    process.exit(0);
  }

  s.start(pc.magenta(`🧠 Extração LLM & Ontologia de ${rawChunks.length} chunks...`));
  
  const children: ChildChunk[] = [];
  let llmFailCount = 0;
  let successfulChunks = 0;
  let embeddingFailures = 0;
  let evidenceRejectedCount = 0;
  let cacheHitCount = 0;
  let cacheMissCount = 0;
  let schemaRepairsTriggered = 0;
  let schemaRepairsSuccessful = 0;
  let llmTotalLatency = 0;
  
  const validationErrorsMap = new Map<string, number>();
  const startTime = Date.now();
  
  for (let i = 0; i < rawChunks.length; i += 5) {
    const batch = rawChunks.slice(i, i + 5);
    s.message(pc.magenta(`🧠 Processando [${i}/${rawChunks.length}] (Cache Hits: ${cacheHitCount})...`));
    
    const extractionPromises = batch.map(async (chunk) => {
      const parent = parents.get(chunk.h2);
      if (!parent) return null;
      
      const chunkId = crypto.randomUUID();
      const cachedChunk = cachedChunksMap.get(chunk.processing_signature);
      const isHit = isReusableCachedChunk(cachedChunk, chunk.cacheParams);
      
      let kg: any;
      let status = 'VALIDATED';
      let validRelations = [];
      
      if (isHit) {
        kg = cachedChunk.metadata.knowledge_graph;
        validRelations = kg.relations;
        status = 'VALIDATED';
        cacheHitCount++;
        successfulChunks++;
        
        return {
          id: chunkId,
          document_id: parent.id, 
          source_version: SOURCE_VERSION,
          content: chunk.fullContent,
          disorder_name: chunk.h2,
          category: chunk.h3,
          tipo_documento: 'FeatureChunk',
          clinical_intent: kg.clinical_intent || 'Diagnóstico',
          risk_level: kg.risk_level || 'LOW',
          chunk_type: chunk.type,
          chapter: chapterName,
          section: chunk.h2,
          subsection: chunk.h3,
          criterion: chunk.criterion_path,
          criterion_path: chunk.criterion_path,
          table_id: chunk.table_id || null,
          table_part: chunk.table_part || null,
          table_total_parts: chunk.table_total_parts || null,
          embedding_model: PIPELINE_VERSIONS.embedding_model,
          embedding_dimensions: PIPELINE_VERSIONS.embedding_dimensions,
          content_hash: chunk.processing_signature,
          ingestion_id: INGESTION_ID,
          ingestion_status: status, 
          metadata: {
            versioning: { ano: new Date().getFullYear(), idioma: 'pt-BR' },
            knowledge_graph: kg
          },
          embedding: cachedChunk.embedding, // Preserva o embedding clonado do cache!
          _isCacheHit: true
        } as ChildChunk & { embedding?: string, _isCacheHit?: boolean };
        
      } else {
        cacheMissCount++;
        const startLLM = Date.now();
        kg = await extractKnowledgeGraph(chunk.text, chunk.h3, chunk.h2, chunkId);
        llmTotalLatency += (Date.now() - startLLM);
        
        if (kg._repair_triggered) schemaRepairsTriggered++;
        if (kg._repair_success) schemaRepairsSuccessful++;
        
        if (kg._failed) {
          console.error(pc.red(`\n❌ Falha na LLM: ${kg.error_code}`));
          llmFailCount++;
          return null;
        }

        // Validação Estrutural e Epistemológica
        let validatedKg = kg;
        const safetyCheck = validateClinicalFactSafety(kg);
        
        if (!safetyCheck.valid) {
          evidenceRejectedCount += safetyCheck.rejectedCount;
          status = 'REJECTED';
          for (const errStr of safetyCheck.errors) {
            validationErrorsMap.set(errStr, (validationErrorsMap.get(errStr) || 0) + 1);
          }
        }
        
        validatedKg.relations = validateRelations(safetyCheck.relations, chunk.fullContent, chunkId);
        validRelations = validatedKg.relations;
        successfulChunks++;
        
        return {
          id: chunkId,
          document_id: parent.id, 
          source_version: SOURCE_VERSION,
          content: chunk.fullContent,
          disorder_name: chunk.h2,
          category: chunk.h3,
          tipo_documento: 'FeatureChunk',
          clinical_intent: kg.clinical_intent || 'Diagnóstico',
          risk_level: kg.risk_level || 'LOW',
          chunk_type: chunk.type,
          chapter: chapterName,
          section: chunk.h2,
          subsection: chunk.h3,
          criterion: chunk.criterion_path,
          criterion_path: chunk.criterion_path,
          table_id: chunk.table_id || null,
          table_part: chunk.table_part || null,
          table_total_parts: chunk.table_total_parts || null,
          embedding_model: PIPELINE_VERSIONS.embedding_model,
          embedding_dimensions: PIPELINE_VERSIONS.embedding_dimensions,
          content_hash: chunk.processing_signature,
          ingestion_id: INGESTION_ID,
          ingestion_status: status, 
          metadata: {
            versioning: { ano: new Date().getFullYear(), idioma: 'pt-BR' },
            knowledge_graph: { entities: kg.entities || [], relations: validRelations },
            llm_error: kg._failed ? kg.error_code : undefined
          }
        } as ChildChunk & { embedding?: string, _isCacheHit?: boolean };
      }
    });

    const results = await Promise.all(extractionPromises);
    results.forEach(res => { if (res) children.push(res); });

    // Break early to not waste time/credits if we already failed
    if (llmFailCount > 0) break;
  }

  s.stop(pc.green(`✅ Extração concluída. Rejeitadas ${evidenceRejectedCount} evidências adversariais.`));

  // A regra de all-or-nothing: Se houver qualquer falha de LLM, morre aqui.
  if (llmFailCount > 0) {
    await supabase.from('clinical_rag_ingestions').update({ 
      status: 'FAILED', 
      total_documents: parents.size,
      total_chunks: rawChunks.length,
      llm_failures: llmFailCount,
      error_summary: `Falha parcial de LLM em ${llmFailCount} chunks. (All-or-Nothing Rule)`,
      completed_at: new Date()
    }).eq('id', INGESTION_ID);
    cancel(`❌ Ingestão FAILED. Falha de LLM detectada em ${llmFailCount} chunks. A política All-or-Nothing abortou a promoção.`);
    process.exit(1);
  }

  const s2 = spinner();
  s2.start(pc.magenta(`📦 Upserting ${parents.size} Palheiros... `));
  try {
    const parentRows = Array.from(parents.values());
    const { data: insertedParents, error: pError } = await withRetry('upsert_parents', 'supabase', supabaseBreaker, 3, 2000, async () => {
      await supabase.from('clinical_knowledge_docs').upsert(parentRows, { onConflict: 'content_hash', ignoreDuplicates: true });
      const hashes = parentRows.map(p => p.content_hash);
      return await supabase.from('clinical_knowledge_docs').select('id, content_hash').in('content_hash', hashes);
    });
    if (pError) throw pError;
    
    const parentIdMap = new Map();
    insertedParents?.forEach(p => parentIdMap.set(p.content_hash, p.id));
    children.forEach(c => {
       const pHash = parentRows.find(pr => pr.disorder_name === c.disorder_name)?.content_hash;
       if (pHash && parentIdMap.has(pHash)) c.document_id = parentIdMap.get(pHash);
    });
  } catch (err: any) {
    s2.stop(pc.red('❌ Erro no Insert de Pais.')); console.error(err); process.exit(1);
  }

  s2.start(pc.magenta(`🐭 Vetorizando e Inserindo ${children.length} Agulhas... `));
  let apiCallsCount = 0;

  for (let i = 0; i < children.length; i += 10) {
    const batch = children.slice(i, i + 10);
    s2.message(pc.magenta(`[${i}/${children.length}] Vetorizando lote...`));
    try {
      const embedPromises = batch.map(async (c, idx) => {
        let vetorStr = (c as any).embedding;
        
        // Skip embedding for cache hits AND for REJECTED chunks
        if (!(c as any)._isCacheHit && c.ingestion_status !== 'REJECTED') {
          await new Promise(res => setTimeout(res, idx * 100));
          const vetor = await fetchEmbeddingWithRetry(c.content);
          apiCallsCount++;
          vetorStr = `[${vetor.join(',')}]`;
        }
        
        const row = { ...c, embedding: vetorStr };
        delete (row as any)._isCacheHit;
        delete (row as any).disorder_name;
        return row;
      });
      const rows = await Promise.all(embedPromises);
      
      const { error } = await withRetry('insert_chunks', 'supabase', supabaseBreaker, 3, 2000, async () => {
        return await supabase.from('clinical_knowledge_chunks').upsert(rows, { onConflict: 'content_hash', ignoreDuplicates: true });
      });
      if (error) throw error;
    } catch (err: any) {
      embeddingFailures += batch.length;
      console.error(err);
    }
  }
  
  if (embeddingFailures > 0) {
    await supabase.from('clinical_rag_ingestions').update({ 
      status: 'FAILED', 
      total_documents: parents.size,
      total_chunks: rawChunks.length,
      successful_chunks: successfulChunks,
      embedding_failures: embeddingFailures,
      error_summary: `Falha de embedding em ${embeddingFailures} chunks.`,
      completed_at: new Date()
    }).eq('id', INGESTION_ID);
    cancel(`❌ Ingestão FAILED devido a erros de vetorização.`);
    process.exit(1);
  }

  // Promoção Atômica para ACTIVE
  s2.start(pc.magenta(`🌟 Promovendo Ingestão ${INGESTION_ID} para ACTIVE e Executando GC...`));
  
  // 1. Atualizar ingestão
  await supabase.from('clinical_rag_ingestions').update({ 
    status: 'ACTIVE', 
    total_documents: parents.size,
    total_chunks: rawChunks.length,
    successful_chunks: successfulChunks,
    completed_at: new Date()
  }).eq('id', INGESTION_ID);

  // 2. Desativar qualquer ingestão anterior ACTIVE para essa mesma fonte + versão
  await supabase.from('clinical_rag_ingestions').update({ status: 'ARCHIVED' })
    .eq('source', authorityProfile)
    .eq('source_version', SOURCE_VERSION)
    .eq('status', 'ACTIVE')
    .neq('id', INGESTION_ID);

  // 3. Promover chunks e docs PENDING/VALIDATED para ACTIVE
  const { error: activeErr } = await supabase.from('clinical_knowledge_chunks')
    .update({ ingestion_status: 'ACTIVE' })
    .eq('ingestion_id', INGESTION_ID)
    .eq('ingestion_status', 'VALIDATED');
  if (activeErr) console.warn(pc.yellow("⚠️ Erro ao promover chunks para ACTIVE."));

  await supabase.from('clinical_knowledge_docs')
    .update({ ingestion_status: 'ACTIVE' })
    .eq('ingestion_id', INGESTION_ID)
    .eq('ingestion_status', 'PENDING');

  // 4. GC de obsoletos
  await supabase.from('clinical_knowledge_chunks')
    .delete()
    .eq('source', authorityProfile)
    .eq('source_version', SOURCE_VERSION)
    .neq('ingestion_id', INGESTION_ID);
    
  await supabase.from('clinical_knowledge_docs')
    .delete()
    .eq('source', authorityProfile)
    .eq('source_version', SOURCE_VERSION)
    .neq('ingestion_id', INGESTION_ID);

  s2.stop(pc.green('✅ GC Concluído. Pipeline totalmente ACTIVE e Auditada.'));
  
  const avgLlmLatencyMs = (successfulChunks - cacheHitCount + llmFailCount) > 0 ? Math.round(llmTotalLatency / (successfulChunks - cacheHitCount + llmFailCount)) : 0;
  
  const runSummary = {
    ingestion_id: INGESTION_ID,
    total_time_ms: Date.now() - startTime,
    avg_llm_latency_ms: avgLlmLatencyMs,
    chunks_total: rawChunks.length,
    cache_hits: cacheHitCount,
    cache_misses: cacheMissCount,
    llm_success: successfulChunks - cacheHitCount,
    llm_failure: llmFailCount,
    schema_repairs_triggered: schemaRepairsTriggered,
    schema_repairs_successful: schemaRepairsSuccessful,
    validation_errors: Array.from(validationErrorsMap.entries()).map(([type, count]) => ({ type, count })),
    embedding_success: successfulChunks - cacheHitCount - embeddingFailures,
    embedding_failure: embeddingFailures,
    evidence_rejected: evidenceRejectedCount,
    total_api_calls: apiCallsCount
  };
  
  console.log(JSON.stringify({ event: 'run_summary', data: runSummary }, null, 2));
  outro(pc.green(`Operação finalizada com sucesso. ID: ${INGESTION_ID}`));
  process.exit(0);
}

const _filename = fileURLToPath(import.meta.url);
if (process.argv[1] === _filename) {
  main().catch(console.error);
}
