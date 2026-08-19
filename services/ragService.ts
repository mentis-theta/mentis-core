/**
 * RAG Service — Busca Semântica Vetorial (pgvector + Gemini Embeddings)
 *
 * Substitui o knowledgeBaseService.ts (busca por keywords in-memory)
 * por busca semântica usando embeddings vetoriais e similaridade de cosseno.
 *
 * Mitigações incorporadas (v5):
 * - Risco 1: try/catch com fallback para knowledgeBaseService local
 * - Risco 2: truncamento de query para evitar estouro do modelo de embedding
 * - Risco 3: Force Retrieval 100% inclusivo para RiskChunks
 * - Risco 4: Authority Profile Mapeado em Backend (flexível)
 * - Risco 5: Knowledge Merge para compactar Riscos repetidos de um mesmo transtorno
 */

import { supabase } from './supabaseClient.ts';
import { searchKnowledgeBase } from './knowledgeBaseService.ts';

// ============================================================================
// Tipos
// ============================================================================

export interface ClinicalKnowledgeResult {
  id: string;
  source: string;
  code: string;
  disorder_name: string;
  category: string;
  content: string;
  similarity: number; // Will map to combined_score * authority
  metadata: Record<string, any>;
  chunk_content?: string;
  tipo_documento?: string;
  clinical_intent?: string;
  risk_level?: string;
  authority_profile?: string;
  nivel_evidencia?: string;
  original_sources?: string[]; // IDs originais quando aglutinado
  explainability?: {
    vector_rank: number | null;
    fts_rank: number | null;
    authority_weight: number;
    force_retrieved: boolean;
    rrf_combined_score: number;
  };
}

// ============================================================================
// Configuração de Autoridade (v5)
// ============================================================================

let AUTHORITY_WEIGHT_MAP: Record<string, number> = {
  'DSM-5-TR': 1.0,
  'CID-11': 0.95,
  'SCID-5-CV': 0.95,
  'Protocolo TCC': 0.90,
  'Outro': 0.85
};

export function overrideAuthorityWeights(newWeights: Record<string, number>) {
  AUTHORITY_WEIGHT_MAP = { ...AUTHORITY_WEIGHT_MAP, ...newWeights };
}

function getAuthorityWeight(profile?: string): number {
  if (!profile) return 0.85;
  return AUTHORITY_WEIGHT_MAP[profile] || 0.85;
}

// ============================================================================
// Cache em Memória (TTL de 5 minutos)
// ============================================================================

interface CacheEntry {
  results: ClinicalKnowledgeResult[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const queryCache = new Map<string, CacheEntry>();

function getCachedResults(query: string): ClinicalKnowledgeResult[] | null {
  const normalizedKey = query.toLowerCase().trim();
  const entry = queryCache.get(normalizedKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    queryCache.delete(normalizedKey);
    return null;
  }
  return entry.results;
}

function setCachedResults(query: string, results: ClinicalKnowledgeResult[]): void {
  const normalizedKey = query.toLowerCase().trim();
  queryCache.set(normalizedKey, { results, timestamp: Date.now() });
  if (queryCache.size > 50) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }
}

// ============================================================================
// Geração de Embedding
// ============================================================================

const MAX_QUERY_CHARS = 2000;

function truncateQuery(query: string): string {
  if (query.length <= MAX_QUERY_CHARS) return query;
  const truncated = query.substring(0, MAX_QUERY_CHARS);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      action: 'embed_content',
      payload: {
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 768 }
      }
    }
  });
  if (error) throw error;
  const embedding = data?.embeddings?.[0]?.values;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Embedding inválido retornado pela API');
  }
  return embedding;
}

// ============================================================================
// Regras de Diversidade (MMR Heurístico) e Intenção
// ============================================================================

function extractIntent(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes('tratamento') || q.includes('terapia') || q.includes('intervenção')) return 'Tratamento';
  if (q.includes('critério') || q.includes('diagnosticar') || q.includes('dsm')) return 'Critério DSM';
  if (q.includes('diferencial')) return 'Diagnóstico diferencial';
  if (q.includes('risco') || q.includes('suicídio') || q.includes('morte') || q.includes('automutilação')) return 'Risco';
  if (q.includes('avaliar') || q.includes('entrevista') || q.includes('pergunta')) return 'Avaliação inicial';
  return null;
}

function applyMetadataMMR(candidates: ClinicalKnowledgeResult[], maxResults: number): ClinicalKnowledgeResult[] {
  const selected: ClinicalKnowledgeResult[] = [];
  const remaining = [...candidates];
  
  while(selected.length < maxResults && remaining.length > 0) {
     let bestScore = -Infinity;
     let bestIndex = 0;
     
     for(let i=0; i<remaining.length; i++) {
        const candidate = remaining[i];
        let penalty = 0;
        
        for (const s of selected) {
           if (s.disorder_name === candidate.disorder_name) {
              penalty += 0.2;
              if (s.tipo_documento === candidate.tipo_documento) {
                 penalty += 0.5;
              }
           } else {
              if (s.tipo_documento === candidate.tipo_documento) {
                 penalty += 0.05;
              }
           }
        }
        
        const mmrScore = candidate.similarity - penalty;
        if (mmrScore > bestScore) {
           bestScore = mmrScore;
           bestIndex = i;
        }
     }
     selected.push(remaining[bestIndex]);
     remaining.splice(bestIndex, 1);
  }
  return selected;
}

// ============================================================================
// Knowledge Merge (V5 - Aglutinação Estrutural de Riscos)
// ============================================================================
function applyKnowledgeMerge(candidates: ClinicalKnowledgeResult[]): ClinicalKnowledgeResult[] {
  const results: ClinicalKnowledgeResult[] = [];
  
  // Agrupar RiskChunks por transtorno
  const riskGroups = new Map<string, ClinicalKnowledgeResult[]>();
  const others: ClinicalKnowledgeResult[] = [];
  
  for (const c of candidates) {
    if (c.tipo_documento === 'RiskChunk' && c.disorder_name) {
      if (!riskGroups.has(c.disorder_name)) riskGroups.set(c.disorder_name, []);
      riskGroups.get(c.disorder_name)!.push(c);
    } else {
      others.push(c);
    }
  }

  // Mesclar riscos se houver mais de 1 pro mesmo transtorno
  for (const [disorder, chunks] of riskGroups.entries()) {
    if (chunks.length === 1) {
      results.push(chunks[0]);
    } else {
      // Extrair entidades de todos os RiskChunks deste transtorno
      const mergedEntities = new Set<string>();
      let maxScore = 0;
      let highestRisk = 'HIGH'; // se estamos aqui, é HIGH ou CRITICAL
      const sourceIds: string[] = [];
      
      chunks.forEach(ck => {
        if (ck.similarity > maxScore) maxScore = ck.similarity;
        if (ck.risk_level === 'CRITICAL') highestRisk = 'CRITICAL';
        sourceIds.push(ck.id);
        
        // Pega do Knowledge Graph
        const kg = ck.metadata?.knowledge_graph;
        if (kg && kg.entities && Array.isArray(kg.entities)) {
          kg.entities.forEach((e: any) => mergedEntities.add(e.name));
        }
        
        // Fallback textual rudimentar caso o KG tenha falhado em extrair (Regex backup)
        const txt = ck.chunk_content?.toLowerCase() || '';
        if (txt.includes('suicíd') || txt.includes('suicid')) mergedEntities.add('Ideação/Comportamento Suicida');
        if (txt.includes('automutilação') || txt.includes('autolesão')) mergedEntities.add('Automutilação');
        if (txt.includes('violência') || txt.includes('agressividade')) mergedEntities.add('Risco de Violência');
      });

      const bullets = Array.from(mergedEntities).map(e => `• ${e}`).join('\n');
      const synthesizedContent = `[${disorder} - Riscos Clínicos (Sintetizado)]\nRiscos associados mapeados a partir de ${chunks.length} fontes textuais no manual:\n${bullets}`;

      // Cria o chunk sintético
      const mergedChunk: ClinicalKnowledgeResult = {
        id: `synth-risk-${disorder.replace(/\s/g, '-')}`,
        source: chunks[0].source, // Assume mesma fonte pro transtorno (ou junta)
        code: chunks[0].code,
        disorder_name: disorder,
        category: 'Risco Sintetizado',
        content: synthesizedContent,
        chunk_content: synthesizedContent,
        similarity: maxScore,
        metadata: {
          note: 'Merged by Knowledge Merge Layer',
          merged_chunks: chunks.length
        },
        tipo_documento: 'RiskChunk',
        clinical_intent: 'Risco',
        risk_level: highestRisk,
        authority_profile: chunks[0].authority_profile,
        nivel_evidencia: chunks[0].nivel_evidencia,
        original_sources: sourceIds, // Ponteiros mantidos para a UI
        explainability: {
           vector_rank: null,
           fts_rank: null,
           authority_weight: getAuthorityWeight(chunks[0].authority_profile),
           force_retrieved: true, // Se foi fundido, ele contém forças
           rrf_combined_score: maxScore
        }
      };
      results.push(mergedChunk);
    }
  }

  // Anexa os que não são de risco
  return [...results, ...others];
}

// ============================================================================
// Busca Semântica Principal Híbrida (Vector + FTS via RRF)
// ============================================================================

export async function searchClinicalKnowledge(
  query: string,
  maxResults: number = 6
): Promise<ClinicalKnowledgeResult[]> {
  if (!query.trim()) return [];

  const cached = getCachedResults(query);
  if (cached) return cached;

  try {
    const safeQuery = truncateQuery(query);
    const embedding = await generateEmbedding(safeQuery);
    const intent = extractIntent(safeQuery);

    // 1. Busca Híbrida via RPC v3
    const { data: searchData, error: searchError } = await supabase.rpc('match_clinical_knowledge_docs_v3', {
      query_text: safeQuery,
      query_embedding: embedding,
      match_count: 30,
      intent_filter: intent,
      rrf_k: 60
    });

    if (searchError) throw searchError;

    if (!searchData || searchData.length === 0) {
      return fallbackToLocalKB(query, maxResults);
    }

    const uniqueDisorders = Array.from(new Set(searchData.map((d: any) => d.disorder_name))).filter(Boolean) as string[];

    let candidates: ClinicalKnowledgeResult[] = searchData.map((row: any) => ({
      id: row.id,
      source: row.source,
      code: row.code || '',
      disorder_name: row.disorder_name || '',
      category: row.category || '',
      content: row.content,
      // V5: O backend aplica o lookup de autoridade sobre o score combinado do RRF
      similarity: row.combined_score * getAuthorityWeight(row.authority_profile),
      metadata: row.metadata || {},
      chunk_content: row.chunk_content,
      tipo_documento: row.tipo_documento,
      clinical_intent: row.clinical_intent,
      risk_level: row.risk_level,
      authority_profile: row.authority_profile,
      nivel_evidencia: row.nivel_evidencia,
      explainability: {
         vector_rank: row.vector_rank,
         fts_rank: row.fts_rank,
         authority_weight: getAuthorityWeight(row.authority_profile),
         force_retrieved: false,
         rrf_combined_score: row.combined_score
      }
    }));

    // 2. Force Retrieval (Segurança Clínica: Inclusão mandatória de Críticos)
    for (const disorder of uniqueDisorders) {
       const { data: riskData } = await supabase.rpc('get_critical_risks_for_disorder', {
          disorder_target: disorder
       });
       if (riskData && riskData.length > 0) {
          for (const risk of riskData) {
             const weight = getAuthorityWeight(risk.authority_profile);
             if (!candidates.find(c => c.id === risk.id)) {
                candidates.push({
                   id: risk.id,
                   source: risk.source,
                   code: risk.code || '',
                   disorder_name: risk.disorder_name || '',
                   category: risk.category || '',
                   content: risk.content,
                   similarity: 99.0 * weight, // Force include guarantee
                   metadata: risk.metadata || {},
                   chunk_content: risk.chunk_content,
                   tipo_documento: risk.tipo_documento,
                   clinical_intent: risk.clinical_intent,
                   risk_level: risk.risk_level,
                   authority_profile: risk.authority_profile,
                   nivel_evidencia: risk.nivel_evidencia,
                   explainability: {
                      vector_rank: null,
                      fts_rank: null,
                      authority_weight: weight,
                      force_retrieved: true,
                      rrf_combined_score: 99.0
                   }
                });
             } else {
                const existing = candidates.find(c => c.id === risk.id);
                if (existing) {
                   existing.similarity = 99.0 * weight;
                   if (existing.explainability) {
                      existing.explainability.force_retrieved = true;
                   }
                }
             }
          }
       }
    }

    // 3. Knowledge Merge (Sintetizar Risks Repetidos antes de podar)
    candidates = applyKnowledgeMerge(candidates);

    // 4. Aplica Diversidade (MMR) sobre os fundidos
    let finalResults = applyMetadataMMR(candidates, maxResults);

    // 5. Garante que os CRITICALS e HIGHS forçados nunca sejam cortados pelo limite (Segurança Absoluta)
    const criticalForced = candidates.filter(c => c.similarity >= 80.0); // similarity is at least 99 * 0.85
    for (const crit of criticalForced) {
        if (!finalResults.find(f => f.id === crit.id)) {
            finalResults.push(crit);
        }
    }

    // Re-ordena no final
    finalResults = finalResults.sort((a, b) => b.similarity - a.similarity);

    setCachedResults(query, finalResults);
    return finalResults;

  } catch (error) {
    console.warn('[RAG] Falha na busca vetorial/híbrida, usando fallback local:', error);
    return fallbackToLocalKB(query, maxResults);
  }
}

// ============================================================================
// Fallback — Busca Local por Keywords
// ============================================================================

function fallbackToLocalKB(query: string, maxResults: number): ClinicalKnowledgeResult[] {
  const localResults = searchKnowledgeBase(query, maxResults);
  return localResults.map(chunk => ({
    id: chunk.id,
    source: chunk.source,
    code: '',
    disorder_name: '',
    category: '',
    content: chunk.content,
    similarity: 0,
    metadata: {}
  }));
}
