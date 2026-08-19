import { describe, it, expect } from 'vitest';
import { anonymizePII } from '@/services/middleware/anonymizer';
import { ExtractionResult, MiddlewareResult } from '@/types';

describe('Anonymizer (Camada 2 - Middleware)', () => {

    const createInitialResult = (): MiddlewareResult => {
        const baseResult: ExtractionResult = {
            sessionId: 'session-123',
            patientId: 'patient-1',
            observations: [],
            unknownConcepts: [
                {
                    rawText: 'O paciente João da Silva de CPF 123.456.789-00 relatou dores fortes. Email dele é joao@email.com, tel (11) 98765-4321.',
                    suggestedConcept: 'unknown',
                    confidence: 0.5
                }
            ],
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
        };

        return {
            result: baseResult,
            issues: [],
            events: []
        };
    };

    it('should anonymize CPF, Email and Phone numbers in unknownConcepts', () => {
        const input = createInitialResult();
        const output = anonymizePII(input);
        
        const text = output.result.unknownConcepts[0].rawText;

        // Structured PII Removed
        expect(text).not.toContain('123.456.789-00');
        expect(text).toContain('[CPF_REMOVED]');
        
        expect(text).not.toContain('joao@email.com');
        expect(text).toContain('[EMAIL_REMOVED]');
        
        expect(text).not.toContain('(11) 98765-4321');
        expect(text).toContain('[PHONE_REMOVED]');
        
        // Ensure Domain Event is created
        expect(output.events.some((e: any) => e.type === 'PII_Anonymized')).toBe(true);
    });

    it('should not throw issues, just sanitize silently', () => {
        const input = createInitialResult();
        const output = anonymizePII(input);
        
        // PII cleanup is an expected operation, not an error.
        expect(output.issues.length).toBe(0);
    });

});
