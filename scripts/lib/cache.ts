import crypto from 'crypto';

export interface CacheSignatureParams {
  normalized_content: string;
  provenance: string;
  source_version: number;
  chunker_version: string;
  prompt_version: string;
  kg_schema_version: string;
  normalization_version: string;
  extraction_model: string;
  extraction_temperature: number;
  embedding_model: string;
  dimensions: number;
}

export function generateProcessingSignature(params: CacheSignatureParams): string {
  // Canonical JSON format for strictly deterministic hashing. Keys are explicitly ordered.
  const canonicalString = JSON.stringify({
    chunker_version: params.chunker_version,
    dimensions: params.dimensions,
    embedding_model: params.embedding_model,
    extraction_model: params.extraction_model,
    extraction_temperature: params.extraction_temperature,
    kg_schema_version: params.kg_schema_version,
    normalization_version: params.normalization_version,
    normalized_content: params.normalized_content,
    prompt_version: params.prompt_version,
    provenance: params.provenance,
    source_version: params.source_version
  });
  
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function isReusableCachedChunk(chunk: any, expectedParams: CacheSignatureParams): boolean {
  if (!chunk) return false;
  
  // Exact processing signature match
  const expectedSignature = generateProcessingSignature(expectedParams);
  if (chunk.content_hash !== expectedSignature) return false;
  
  // Embedding integrity check
  if (!chunk.embedding || typeof chunk.embedding !== 'string' || chunk.embedding.length < 10) return false;
  
  // Dimensions match (implicit in the hash, but good to sanity check if there's a parsing issue)
  if (chunk.embedding_dimensions !== expectedParams.dimensions) return false;
  
  // Knowledge Graph structural integrity check
  if (!chunk.metadata || !chunk.metadata.knowledge_graph) return false;
  const kg = chunk.metadata.knowledge_graph;
  if (!Array.isArray(kg.relations)) return false;
  
  // Provenance check
  if (chunk.source_version !== expectedParams.source_version) return false;
  
  return true;
}
