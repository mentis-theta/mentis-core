import { describe, it, expect } from 'vitest';
import { checkConsistency } from '../../services/middleware/consistencyChecker';
import { MiddlewareResult } from '../../types';

describe('Consistency Checker (Camada 2 - Middleware)', () => {

    const createInitialResult = (conceptId: string, value: any): MiddlewareResult => {
        return {
            result: {
                sessionId: 'session-123',
                patientId: 'patient-1',
                observations: [
                    {
                        id: 'obs-1',
                        patient_id: 'patient-1',
                        conceptId,
                        valueType: typeof value === 'boolean' ? 'boolean' : 'text',
                        value,
                        date: new Date().toISOString(),
                        isCurrent: true,
                        status: 'PendingExtraction',
                        evidence: {
                            origin: 'patient',
                            strength: 'direct',
                            certainty: 'high',
                            confidence: 0.9,
                            source_refs: ['session-123']
                        }
                    }
                ],
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

    it('should emit a warning if sleep.insomnia is reported as boolean false (negation)', () => {
        const input = createInitialResult('SYM-0001', false);
        const output = checkConsistency(input);
        
        expect(output.issues.some((i: any) => i.code === 'CC-001')).toBe(true);
        expect(output.issues.find((i: any) => i.code === 'CC-001')?.severity).toBe('medium');
    });

    it('should pass cleanly if rule is not met', () => {
        const input = createInitialResult('SYM-0001', true);
        const output = checkConsistency(input);
        
        expect(output.issues.length).toBe(0);
    });

});
