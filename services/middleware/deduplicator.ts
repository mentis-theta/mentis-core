import { MiddlewareResult, ClinicalObservation } from '../../types';

/**
 * Deduplicator (Camada 2 - Middleware)
 * Preserva o Histórico: NENHUMA observação é deletada.
 * Estabelece links lógicos (derivedFrom, relatedTo) entre observações repetidas 
 * e controla a flag "isCurrent".
 */
export function deduplicateObservations(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    let deduplicationCount = 0;

    // Agrupa por ConceptID
    const conceptGroups = new Map<string, ClinicalObservation[]>();
    for (const obs of result.observations) {
        if (!conceptGroups.has(obs.conceptId)) {
            conceptGroups.set(obs.conceptId, []);
        }
        conceptGroups.get(obs.conceptId)!.push({ ...obs });
    }

    const processedObservations: ClinicalObservation[] = [];

    for (const [conceptId, obsList] of conceptGroups.entries()) {
        if (obsList.length === 1) {
            processedObservations.push(obsList[0]);
            continue;
        }

        // Ordena por data (mais antigas primeiro)
        obsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentActiveObs = obsList[0];
        processedObservations.push(currentActiveObs);

        for (let i = 1; i < obsList.length; i++) {
            const nextObs = obsList[i];
            
            // Se vieram da MESMA sessão (mesma data exata e extraídas agora) -> Merged (relatedTo)
            if (nextObs.date === currentActiveObs.date && nextObs.status === 'PendingExtraction' && currentActiveObs.status === 'PendingExtraction') {
                nextObs.status = 'Merged';
                nextObs.isCurrent = false;
                nextObs.relatedTo = nextObs.relatedTo || [];
                nextObs.relatedTo.push(currentActiveObs.id);
                
                processedObservations.push(nextObs);
                deduplicationCount++;
            } 
            // Se for uma evolução ao longo do tempo (Deduplicação Longitudinal) -> derivedFrom
            else {
                currentActiveObs.isCurrent = false; // A antiga deixa de ser a current
                
                nextObs.isCurrent = true;
                nextObs.derivedFrom = nextObs.derivedFrom || [];
                nextObs.derivedFrom.push(currentActiveObs.id);
                
                processedObservations.push(nextObs);
                
                // Atualiza o ponteiro de qual é a mais nova
                currentActiveObs = nextObs;
                deduplicationCount++;
            }
        }
    }

    const allEvents = [...events];
    if (deduplicationCount > 0) {
        allEvents.push({
            type: 'ObservationsDeduplicated',
            payload: { count: deduplicationCount, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    }

    return {
        result: {
            ...result,
            observations: processedObservations
        },
        issues,
        events: allEvents
    };
}
