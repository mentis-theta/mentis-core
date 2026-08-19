import { describe, it, expect } from 'vitest';
import { analyzeTrends } from '@/services/middleware/longitudinal/trendAnalyzer';
import { MiddlewareResult, ClinicalObservation, DomainEvent } from '@/types';

describe('Trend Analyzer (Camada 2 - Longitudinal Validator)', () => {

    const createInitialResult = (observations: Partial<ClinicalObservation>[]): MiddlewareResult => {
        return {
            result: {
                sessionId: 'session-123',
                patientId: 'patient-1',
                observations: observations as ClinicalObservation[],
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

    it('should identify worsening trend when severity increases', () => {
        const input = createInitialResult([
            { id: 'old-1', conceptId: 'SYM-0003', value: 'mild', date: '2023-01-01', isCurrent: false },
            { id: 'new-1', conceptId: 'SYM-0003', value: 'severe', date: '2023-01-08', isCurrent: true, derivedFrom: ['old-1'] }
        ]);

        const output = analyzeTrends(input);
        
        const event = output.events.find((e: any) => e.type === 'TrendDetected');
        expect(event).toBeDefined();
        expect(event?.payload.trend).toBe('worsening');
        expect(event?.payload.conceptId).toBe('SYM-0003');
    });

    it('should identify improving trend when severity decreases', () => {
        const input = createInitialResult([
            { id: 'old-1', conceptId: 'SYM-0003', value: 'severe', date: '2023-01-01', isCurrent: false },
            { id: 'new-1', conceptId: 'SYM-0003', value: 'mild', date: '2023-01-08', isCurrent: true, derivedFrom: ['old-1'] }
        ]);

        const output = analyzeTrends(input);
        
        const event = output.events.find((e: any) => e.type === 'TrendDetected');
        expect(event).toBeDefined();
        expect(event?.payload.trend).toBe('improving');
    });

    it('should identify stable trend when severity is identical', () => {
        const input = createInitialResult([
            { id: 'old-1', conceptId: 'SYM-0003', value: 'mild', date: '2023-01-01', isCurrent: false },
            { id: 'new-1', conceptId: 'SYM-0003', value: 'mild', date: '2023-01-08', isCurrent: true, derivedFrom: ['old-1'] }
        ]);

        const output = analyzeTrends(input);
        
        const event = output.events.find((e: any) => e.type === 'TrendDetected');
        expect(event).toBeDefined();
        expect(event?.payload.trend).toBe('stable');
    });

});
