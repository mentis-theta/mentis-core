import { MiddlewareResult, ClinicalObservation, ValidationIssue, DomainEvent } from '../../types';

/**
 * Canonicalizer (Camada 2 - Middleware)
 * Normaliza os valores das observações.
 * Exemplo: booleanos em string ('sim', 'falso') viram tipos primitivos strict.
 */
export function canonicalizeObservations(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    let canonicalizedCount = 0;
    const newIssues: ValidationIssue[] = [];

    const canonicalizedObservations = result.observations.map(obs => {
        let newValue = obs.value;
        let changed = false;

        if (obs.valueType === 'boolean') {
            if (typeof obs.value === 'string') {
                const lower = obs.value.trim().toLowerCase();
                if (['sim', 'true', 'positivo', 'yes', '1'].includes(lower)) {
                    newValue = 'true';
                    changed = true;
                } else if (['não', 'nao', 'false', 'negativo', 'no', 'falso', '0'].includes(lower)) {
                    newValue = 'false';
                    changed = true;
                } else {
                    newIssues.push({
                        code: 'CANONICALIZATION_FAILED',
                        message: `Cannot canonicalize '${obs.value}' to boolean for obs ${obs.id}`,
                        severity: 'medium'
                    });
                }
            }
        } else if (obs.valueType === 'numeric') {
            if (typeof obs.value === 'string') {
                const parsed = Number(obs.value.replace(',', '.'));
                if (isNaN(parsed)) {
                    newIssues.push({
                        code: 'CANONICALIZATION_FAILED',
                        message: `Cannot canonicalize '${obs.value}' to numeric for obs ${obs.id}`,
                        severity: 'medium'
                    });
                } else {
                    newValue = parsed;
                    changed = true;
                }
            }
        }

        if (changed) {
            canonicalizedCount++;
        }

        return {
            ...obs,
            value: newValue
        };
    });

    const allIssues = [...issues, ...newIssues];
    const allEvents = [...events];

    if (canonicalizedCount > 0) {
        allEvents.push({
            type: 'ObservationCanonicalized',
            payload: { count: canonicalizedCount, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    }

    return {
        result: {
            ...result,
            observations: canonicalizedObservations
        },
        issues: allIssues,
        events: allEvents
    };
}
