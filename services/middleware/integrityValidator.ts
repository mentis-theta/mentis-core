import { ExtractionResult, MiddlewareResult, ValidationIssue } from '../../types';
import { ontology } from '../clinicalOntology';

/**
 * Integrity Validator (Camada 2 - Middleware)
 * Primeiro filtro do motor de qualidade.
 * Garante que os dados extraídos obedeçam aos invariantes do domínio.
 */
export function validateIntegrity(result: ExtractionResult): MiddlewareResult {
    const issues: ValidationIssue[] = [];
    const events: any[] = [];
    
    const seenIds = new Set<string>();

    for (const obs of result.observations) {
        
        // 1. Verificação de ID duplicado
        if (seenIds.has(obs.id)) {
            issues.push({
                code: 'DUPLICATED_ID',
                message: `Observation ID ${obs.id} appears more than once.`,
                severity: 'fatal'
            });
        }
        seenIds.add(obs.id);

        // 2. Verificação de Evidence
        if (!obs.evidence) {
            issues.push({
                code: 'MISSING_EVIDENCE',
                message: `Observation ${obs.id} is missing evidence block.`,
                severity: 'fatal'
            });
        } else {
            // 3. Verificação de Confidence [0, 1]
            if (obs.evidence.confidence < 0 || obs.evidence.confidence > 1) {
                issues.push({
                    code: 'INVALID_CONFIDENCE',
                    message: `Observation ${obs.id} has invalid confidence: ${obs.evidence.confidence}. Must be between 0 and 1.`,
                    severity: 'fatal'
                });
            }
        }

        // 4. Cobertura Ontológica
        if (!ontology.getById(obs.conceptId)) {
            issues.push({
                code: 'INVALID_CONCEPT',
                message: `Concept ${obs.conceptId} is not in the clinical ontology.`,
                severity: 'fatal'
            });
        }

        // 5. Workflow State
        if (obs.status !== 'PendingExtraction' && obs.status !== 'Extracted') {
            issues.push({
                code: 'INVALID_WORKFLOW_STATE',
                message: `Observation ${obs.id} has invalid extraction state: ${obs.status}. Must be PendingExtraction or Extracted.`,
                severity: 'fatal'
            });
        }
    }

    if (issues.length > 0) {
        events.push({
            type: 'IntegrityCheckFailed',
            payload: { issueCount: issues.length, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    } else {
        events.push({
            type: 'IntegrityCheckPassed',
            payload: { observationCount: result.observations.length, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    }

    return {
        result,
        issues,
        events
    };
}
