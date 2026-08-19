import { describe, it, expect } from 'vitest';
import { deduplicateObservations } from '../../services/middleware/deduplicator';
import { MiddlewareResult, ClinicalObservation } from '../../types';

describe('Deduplicator (Camada 2 - Middleware)', () => {

    const createInitialResult = (obs: Partial<ClinicalObservation>[]): MiddlewareResult => {
        return {
            result: {
                sessionId: 'session-123',
                patientId: 'patient-1',
                observations: obs as ClinicalObservation[],
                unknownConcepts: [],
                concepts: [],
                psychometrics: [],
                warnings: [],
                metadata: {
                    extractorVersion: '1.0',
                    ontologyVersion: '1.0',
                    model: 'test',
                    extractedAt: new Date().toISOString(),
                    durationMs: 10,
                    telemetry: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, latencyMs: 0, modelVersion: 'test' }
                }
            },
            issues: [],
            events: []
        };
    };

    it('should logically link duplicate observations in the SAME extraction without deleting them', () => {
        // Simula o LLM extraindo duas observações para o mesmo conceito na mesma sessão
        const input = createInitialResult([
            { id: 'obs-1', conceptId: 'SYM-0001', isCurrent: true, date: '2023-01-01', status: 'PendingExtraction' },
            { id: 'obs-2', conceptId: 'SYM-0001', isCurrent: true, date: '2023-01-01', status: 'PendingExtraction' }
        ]);

        const output = deduplicateObservations(input);
        
        // Regra de Ouro: Nunca deletar o histórico
        expect(output.result.observations.length).toBe(2);

        const obs1 = output.result.observations.find((o: any) => o.id === 'obs-1');
        const obs2 = output.result.observations.find((o: any) => o.id === 'obs-2');

        // obs-2 vira 'Merged' e aponta para obs-1
        expect(obs2?.status).toBe('Merged');
        expect(obs2?.relatedTo).toContain('obs-1');
        expect(obs2?.isCurrent).toBe(false);

        // obs-1 permanece intacto e atual
        expect(obs1?.isCurrent).toBe(true);

        expect(output.events.some((e: any) => e.type === 'ObservationsDeduplicated')).toBe(true);
    });

    it('should logically supersede an OLD observation when a new one arrives (Longitudinal Deduplication)', () => {
        // Simula que o paciente já tem um registro de SYM-0001 no banco
        const oldObsInDB = { id: 'old-obs-99', conceptId: 'SYM-0001', isCurrent: true, date: '2022-01-01', status: 'Approved' as any };
        
        const input = createInitialResult([
            oldObsInDB,
            { id: 'new-obs-1', conceptId: 'SYM-0001', isCurrent: true, date: '2023-01-01', status: 'PendingExtraction' as any }
        ]);

        const output = deduplicateObservations(input);
        
        // Ambas continuam existindo
        expect(output.result.observations.length).toBe(2);

        const oldObs = output.result.observations.find((o: any) => o.id === 'old-obs-99');
        const newObs = output.result.observations.find((o: any) => o.id === 'new-obs-1');

        // A observação antiga perde o status de "atual", mas NÃO É DELETADA nem alterada seu status de Approved
        expect(oldObs?.isCurrent).toBe(false);
        
        // A nova observação aponta para a antiga como "derivada" temporalmente
        expect(newObs?.isCurrent).toBe(true);
        expect(newObs?.derivedFrom).toContain('old-obs-99');
    });

});
