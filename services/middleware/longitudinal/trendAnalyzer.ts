import { MiddlewareResult, DomainEvent } from '../../../types';

const SEVERITY_SCALE: Record<string, number> = {
    'none': 0,
    'mild': 1,
    'moderate': 2,
    'severe': 3,
    'extreme': 4
};

function getScore(value: string | boolean | number): number {
    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return SEVERITY_SCALE[lower] ?? -1;
    }
    if (typeof value === 'number') {
        return value;
    }
    return -1;
}

/**
 * Trend Analyzer (Camada 2 - Longitudinal Validator)
 * Mede se o paciente melhorou ou piorou comparando observações sequenciais (derivedFrom).
 */
export function analyzeTrends(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    const newEvents: DomainEvent[] = [];

    // Para cada observação atual (isCurrent)
    const currentObs = result.observations.filter(o => o.isCurrent);

    for (const current of currentObs) {
        if (!current.derivedFrom || current.derivedFrom.length === 0) continue;

        // Acha a observação raiz (anterior) da qual essa derivou (no nosso mock, passamos no array de observations)
        // Em um cenário real de banco, isso precisaria de um fetch, mas no Middleware ela vem no pacote injetado pelo Deduplicator
        const previousId = current.derivedFrom[current.derivedFrom.length - 1]; // Pegamos a última origem direta
        const previous = result.observations.find(o => o.id === previousId);

        if (previous) {
            const currentScore = getScore(current.value);
            const prevScore = getScore(previous.value);

            if (currentScore >= 0 && prevScore >= 0) {
                let trend = 'unknown';
                if (currentScore > prevScore) trend = 'worsening';
                else if (currentScore < prevScore) trend = 'improving';
                else trend = 'stable';

                newEvents.push({
                    type: 'TrendDetected',
                    payload: {
                        patientId: result.patientId,
                        conceptId: current.conceptId,
                        trend,
                        from: previous.value,
                        to: current.value
                    },
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    return {
        result,
        issues,
        events: [...events, ...newEvents]
    };
}
