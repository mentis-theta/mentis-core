import { describe, it, expect } from 'vitest';
import { evaluateRisk } from '@/services/middleware/longitudinal/riskEscalation';
import { MiddlewareResult, ClinicalObservation, DomainEvent, ValidationIssue } from '@/types';

describe('Risk Escalation (Camada 2 - Longitudinal Validator)', () => {

    const createInitialResult = (events: DomainEvent[]): MiddlewareResult => {
        return {
            result: {
                sessionId: 'session-123',
                patientId: 'patient-1',
                observations: [],
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
            events
        };
    };

    it('should flag a RISK_ESCALATION issue if multiple severe worsening trends are detected', () => {
        // Simula que o Trend Analyzer rodou antes e disparou eventos de piora
        const input = createInitialResult([
            { type: 'TrendDetected', payload: { trend: 'worsening', conceptId: 'SYM-0003', from: 'mild', to: 'severe' }, timestamp: '' },
            { type: 'TrendDetected', payload: { trend: 'worsening', conceptId: 'SYM-0004', from: 'none', to: 'severe' }, timestamp: '' }
        ]);

        const output = evaluateRisk(input);
        
        expect(output.issues.some((i: any) => i.code === 'RISK_ESCALATION_DETECTED')).toBe(true);
        expect(output.issues.find((i: any) => i.code === 'RISK_ESCALATION_DETECTED')?.severity).toBe('high');
    });

    it('should pass cleanly if trends are stable or improving', () => {
        const input = createInitialResult([
            { type: 'TrendDetected', payload: { trend: 'improving', conceptId: 'SYM-0003', from: 'severe', to: 'mild' }, timestamp: '' }
        ]);

        const output = evaluateRisk(input);
        
        expect(output.issues.length).toBe(0);
    });

});
