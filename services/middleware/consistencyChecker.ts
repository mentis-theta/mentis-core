import { MiddlewareResult, ValidationIssue } from '../../types';

// Motor de regras baseado em JSON
// (Em produção, essas regras viriam do banco ou da Layer 0 de governança)
const CONSISTENCY_RULES = [
    {
        ruleId: 'CC-001',
        description: 'Negation of Symptoms',
        condition: (obs: any) => obs.conceptId.startsWith('SYM-') && obs.value === false,
        action: 'warn',
        severity: 'medium',
        message: 'Symptom reported as false. Check if this is a clinical negation.'
    },
    {
        ruleId: 'CC-002',
        description: 'High Confidence without Context',
        condition: (obs: any) => obs.evidence.confidence > 0.95 && obs.evidence.origin === 'psychologist' && obs.evidence.strength === 'clinicalInference' && (!obs.evidence.source_refs || obs.evidence.source_refs.length === 0),
        action: 'block',
        severity: 'fatal',
        message: 'High confidence clinical inference requires explicit source references.'
    }
];

/**
 * Consistency Checker (Camada 2 - Middleware)
 * Motor de regras declarativas (JSON/Funcionais) para evitar if/else espalhados.
 * Capta incoerências clínicas na própria observação.
 */
export function checkConsistency(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    const newIssues: ValidationIssue[] = [];
    let ruleMatches = 0;

    for (const obs of result.observations) {
        for (const rule of CONSISTENCY_RULES) {
            if (rule.condition(obs)) {
                newIssues.push({
                    code: rule.ruleId,
                    message: rule.message,
                    severity: rule.severity as 'low' | 'medium' | 'high' | 'fatal'
                });
                ruleMatches++;
            }
        }
    }

    const allIssues = [...issues, ...newIssues];
    const allEvents = [...events];

    if (ruleMatches > 0) {
        allEvents.push({
            type: 'ConsistencyRulesMatched',
            payload: { matchCount: ruleMatches, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    }

    return {
        result,
        issues: allIssues,
        events: allEvents
    };
}
