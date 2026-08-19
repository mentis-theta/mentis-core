import { CandidateConcept, ExtractionWarning } from '../../types';
import { ontology } from '../clinicalOntology';

export interface ResolvedCandidate {
    candidate: CandidateConcept;
    conceptId: string; // 'unknown' if not matched
    status: 'matched' | 'unknown' | 'rejected_low_confidence';
}

/**
 * Módulo de Resolução Ontológica (Ontology Resolver & Confidence Gate)
 * 
 * ADR-001: Valida se a sugestão da IA existe na biblioteca fixa.
 * Implementa o Confidence Gate (< 0.70 vai para Unknown).
 */
export function resolveConcepts(candidates: CandidateConcept[], warnings: ExtractionWarning[]): ResolvedCandidate[] {
    const resolved: ResolvedCandidate[] = [];

    for (const cand of candidates) {
        // Confidence Gate
        if (cand.confidence < 0.70) {
            resolved.push({ candidate: cand, conceptId: 'unknown', status: 'rejected_low_confidence' });
            warnings.push({
                code: 'LOW_CONFIDENCE',
                message: `Candidato '${cand.suggestedConcept}' rejeitado por confiança baixa (${cand.confidence}).`,
                severity: 'low'
            });
            continue;
        }

        if (cand.suggestedConcept && cand.suggestedConcept !== 'unknown') {
            const match = ontology.lookup(cand.suggestedConcept);
            if (match) {
                resolved.push({ candidate: cand, conceptId: match.id, status: 'matched' });
            } else {
                resolved.push({ candidate: cand, conceptId: 'unknown', status: 'unknown' });
                warnings.push({
                    code: 'UNKNOWN_CONCEPT',
                    message: `O termo '${cand.suggestedConcept}' não existe na ontologia e foi marcado como unknown.`,
                    severity: 'medium'
                });
            }
        } else {
            resolved.push({ candidate: cand, conceptId: 'unknown', status: 'unknown' });
        }
    }

    return resolved;
}
