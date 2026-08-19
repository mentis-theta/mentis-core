import { describe, it, expect } from 'vitest';
import { validateIntegrity } from '../../services/middleware/integrityValidator';
import { ExtractionResult, ClinicalObservation, MiddlewareResult, ValidationIssue } from '../../types';

describe('Integrity Validator (Camada 2 - Middleware)', () => {

    const createValidResult = (): ExtractionResult => ({
        sessionId: 'session-123',
        patientId: 'patient-1',
        observations: [
            {
                id: 'obs-1',
                patient_id: 'patient-1',
                conceptId: 'SYM-0001', // sleep.insomnia
                valueType: 'boolean',
                value: 'true',
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
            model: 'test-model',
            extractedAt: new Date().toISOString(),
            durationMs: 100,
            telemetry: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, latencyMs: 0, modelVersion: 'test' }
        }
    });

    it('should pass a valid ExtractionResult without issues', () => {
        const input = createValidResult();
        const { result, issues, events } = validateIntegrity(input);

        expect(issues.length).toBe(0);
        expect(result.observations.length).toBe(1);
    });

    it('should return a fatal issue if confidence is out of bounds', () => {
        const input = createValidResult();
        input.observations[0].evidence.confidence = 1.5; // Invalid

        const { issues } = validateIntegrity(input);

        expect(issues.length).toBe(1);
        expect(issues[0].code).toBe('INVALID_CONFIDENCE');
        expect(issues[0].severity).toBe('fatal');
    });

    it('should return a fatal issue if conceptId is not in the ontology', () => {
        const input = createValidResult();
        input.observations[0].conceptId = 'NON-EXISTENT-ID';

        const { issues } = validateIntegrity(input);

        expect(issues.some((i: ValidationIssue) => i.code === 'INVALID_CONCEPT')).toBe(true);
    });

    it('should return a fatal issue if an observation is missing evidence', () => {
        const input = createValidResult();
        // @ts-ignore - Forçando erro de tipagem runtime
        delete input.observations[0].evidence;

        const { issues } = validateIntegrity(input);

        expect(issues.some((i: ValidationIssue) => i.code === 'MISSING_EVIDENCE')).toBe(true);
    });

    it('should return a fatal issue if there are duplicate Observation IDs', () => {
        const input = createValidResult();
        // Clona a mesma observação para forçar ID duplicado
        input.observations.push({ ...input.observations[0] });

        const { issues } = validateIntegrity(input);

        expect(issues.some((i: ValidationIssue) => i.code === 'DUPLICATED_ID')).toBe(true);
    });

    it('should block incompatible WorkflowStates for extraction', () => {
        const input = createValidResult();
        // Uma observação extraída via LLM deve nascer como PendingExtraction ou Extracted, nunca Approved direto
        input.observations[0].status = 'Approved'; 

        const { issues } = validateIntegrity(input);

        expect(issues.some((i: ValidationIssue) => i.code === 'INVALID_WORKFLOW_STATE')).toBe(true);
    });

});
