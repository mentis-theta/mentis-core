import { describe, it, expect } from 'vitest';
import { canonicalizeObservations } from '../../services/middleware/canonicalizer';
import { MiddlewareResult } from '../../types';

describe('Canonicalizer (Camada 2 - Middleware)', () => {

    const createInitialResult = (value: any, valueType: 'boolean' | 'numeric' | 'ordinal' | 'text' | 'coded'): MiddlewareResult => {
        return {
            result: {
                sessionId: 'session-123',
                patientId: 'patient-1',
                observations: [
                    {
                        id: 'obs-1',
                        patient_id: 'patient-1',
                        conceptId: 'SYM-0001',
                        valueType,
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

    it('should canonicalize string representations of booleans', () => {
        const input = createInitialResult('sim', 'boolean');
        const output = canonicalizeObservations(input);
        
        expect(output.result.observations[0].value).toBe('true');
        expect(output.events.some((e: any) => e.type === 'ObservationCanonicalized')).toBe(true);
    });

    it('should canonicalize negative string representations of booleans', () => {
        const input = createInitialResult('FALSO', 'boolean');
        const output = canonicalizeObservations(input);
        
        expect(output.result.observations[0].value).toBe('false');
    });

    it('should emit a ValidationIssue if valueType is numeric but value is NaN', () => {
        const input = createInitialResult('não é um número', 'numeric');
        const output = canonicalizeObservations(input);
        
        expect(output.issues.some((i: any) => i.code === 'CANONICALIZATION_FAILED')).toBe(true);
    });

});
