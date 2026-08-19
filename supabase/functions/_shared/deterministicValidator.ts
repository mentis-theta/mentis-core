import { EvidenceChain } from './evidenceContract.ts';

// =============================================================================
// Interfaces
// =============================================================================

export interface ValidationContextDocument {
  chunk_id: string;
  content: string;
}

export type StructuralValidationStatus = 'VALID' | 'INVALID';

export interface EvidenceValidationResult {
  chunk_id: string;
  status: StructuralValidationStatus;
  reason?: 'chunk_id_not_found' | 'exact_quote_not_found' | 'empty_exact_quote';
}

export interface ClaimValidationResult {
  claim: string;
  status: StructuralValidationStatus;
  evidence_results: EvidenceValidationResult[];
  reason?: 'no_supporting_evidence' | 'contains_invalid_evidence';
}

export interface ValidationReport {
  total_claims: number;
  valid_claims: number;
  invalid_claims: number;
  claim_validations: ClaimValidationResult[];
}

// =============================================================================
// Validator Core
// =============================================================================

/**
 * Gate 3B: Deterministic Validator
 * 
 * Avalia a integridade estrutural (provenance) de uma resposta gerada.
 * É uma função pura: não avalia faithfulness semântica nem interage com a rede/DB.
 */
export function validateEvidenceChain(
  chain: EvidenceChain,
  contextDocs: ValidationContextDocument[]
): ClaimValidationResult {
  if (!chain.supporting_evidence || chain.supporting_evidence.length === 0) {
    return {
      claim: chain.claim,
      status: 'INVALID',
      evidence_results: [],
      reason: 'no_supporting_evidence'
    };
  }

  const evidence_results: EvidenceValidationResult[] = [];
  let allValid = true;

  // Cria um lookup O(1) rápido para os documentos, mitigando chunks duplicados (pega o primeiro válido)
  const contextMap = new Map<string, string>();
  for (const doc of contextDocs) {
    // Se houver duplicação, o último sobrescreverá (não quebra o .includes)
    contextMap.set(doc.chunk_id, doc.content);
  }

  for (const ev of chain.supporting_evidence) {
    const quote = ev.exact_quote;

    // 1. Validar Quote vazio
    if (!quote || quote.trim() === '') {
      evidence_results.push({
        chunk_id: ev.chunk_id,
        status: 'INVALID',
        reason: 'empty_exact_quote'
      });
      allValid = false;
      continue;
    }

    // 2. Validar existência do chunk
    const chunkContent = contextMap.get(ev.chunk_id);
    if (!chunkContent) {
      evidence_results.push({
        chunk_id: ev.chunk_id,
        status: 'INVALID',
        reason: 'chunk_id_not_found'
      });
      allValid = false;
      continue;
    }

    // 3. Validar Quote exato estrito
    if (!chunkContent.includes(quote)) {
      evidence_results.push({
        chunk_id: ev.chunk_id,
        status: 'INVALID',
        reason: 'exact_quote_not_found'
      });
      allValid = false;
      continue;
    }

    // Se chegou aqui, a evidência é estruturalmente válida
    evidence_results.push({
      chunk_id: ev.chunk_id,
      status: 'VALID'
    });
  }

  return {
    claim: chain.claim,
    status: allValid ? 'VALID' : 'INVALID',
    evidence_results,
    reason: allValid ? undefined : 'contains_invalid_evidence'
  };
}

/**
 * Roda a validação para todas as chains retornando o relatório consolidado
 */
export function generateValidationReport(
  chains: EvidenceChain[],
  contextDocs: ValidationContextDocument[]
): ValidationReport {
  const claim_validations = chains.map(chain => validateEvidenceChain(chain, contextDocs));
  
  const valid_claims = claim_validations.filter(c => c.status === 'VALID').length;
  
  return {
    total_claims: chains.length,
    valid_claims,
    invalid_claims: chains.length - valid_claims,
    claim_validations
  };
}
