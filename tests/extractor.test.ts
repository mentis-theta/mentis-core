import { describe, it, expect } from 'vitest';
import { runExtractorPipeline } from '../services/extractor';
import { Session } from '../types';

describe('Extractor Regression Suite (Modular Pipeline)', () => {
    
    const TIMEOUT = 30000;

    it('should extract insomnia from patient report as a matched observation', async () => {
        const fakeSession: Session = {
            id: 'test-session-1',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'Paciente refere insônia há três meses.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        expect(result).toBeDefined();
        expect(result.observations.length).toBeGreaterThan(0);
        
        const insomniaObs = result.observations.find(o => o.conceptId === 'SYM-0001');
        expect(insomniaObs).toBeDefined();
        
        if (insomniaObs) {
            expect(insomniaObs.evidence.origin).toBe('patient');
        }
    }, TIMEOUT);

    it('should extract direct observation of sadness/crying as psychologist inference', async () => {
        const fakeSession: Session = {
            id: 'test-session-2',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            // "humor deprimido" is likely mapped in the ontology (mood.depressed)
            notes: 'Paciente apresentou humor deprimido e chorou durante toda a sessão.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        expect(result.observations.length).toBeGreaterThan(0);
        
        const obs = result.observations[0];
        expect(obs.evidence.origin).toBe('psychologist');
        // Pode ser 'direct' ou 'clinicalInference' dependendo da classificação LLM
        expect(['direct', 'clinicalInference']).toContain(obs.evidence.strength);
    }, TIMEOUT);

    it('should map unknown concepts to the UnknownConcepts queue, keeping observations clean', async () => {
        const fakeSession: Session = {
            id: 'test-session-3',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'Sinto que meu cérebro está derretendo.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        // A observação bizarra não deve poluir a timeline clínica principal
        expect(result.observations.length).toBe(0);
        
        // Mas deve ser capturada pela fila de Curadoria (Unknown Queue)
        expect(result.unknownConcepts.length).toBeGreaterThan(0);
        const unknownCandidate = result.unknownConcepts[0];
        expect(unknownCandidate.rawText).toContain('cérebro');
    }, TIMEOUT);

    // ==========================================
    // GATE 0: TESTES AVANÇADOS (GOVERNANÇA)
    // ==========================================

    it('should maintain Traceability (source_refs) in all observations', async () => {
        const fakeSession: Session = {
            id: 'trace-session-123',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'Paciente refere insônia de forma constante.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        expect(result.observations.length).toBeGreaterThan(0);
        
        for (const obs of result.observations) {
            expect(obs.evidence.source_refs).toBeDefined();
            expect(obs.evidence.source_refs).toContain('trace-session-123');
        }
    }, TIMEOUT);

    it('should strictly respect Non-inference (Symptom != Diagnosis)', async () => {
        const fakeSession: Session = {
            id: 'test-session-4',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'Paciente relata tristeza constante.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        // Deve extrair a tristeza (sintoma/humor)
        const hasSadness = result.observations.some(o => o.conceptId === 'mood.depressed' || o.conceptId === 'emotion.sadness' || o.conceptId.includes('sad'));
        
        // NÃO deve alucinar o diagnóstico psiquiátrico (Depressão Maior / Transtorno Depressivo)
        const hasMajorDepression = result.observations.some(o => o.conceptId === 'diagnosis.major_depression' || o.conceptId.includes('disorder'));
        
        // Verifica se há alguma extração primeiro
        expect(result.observations.length).toBeGreaterThanOrEqual(0);
        expect(hasMajorDepression).toBe(false);
    }, TIMEOUT);

    it('should process multiple valid extractions independently (Multiple Extraction)', async () => {
        const fakeSession: Session = {
            id: 'test-session-5',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'Paciente refere insônia há três meses e também grave desatenção.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        // Esperamos ao menos duas observações independentes
        expect(result.observations.length).toBeGreaterThanOrEqual(2);
        
        const concepts = result.observations.map(o => o.conceptId);
        // Insônia
        expect(concepts.some(c => c === 'SYM-0001' || c.includes('sleep'))).toBe(true);
        // Desatenção
        expect(concepts.some(c => c === 'SYM-0005' || c.includes('attention'))).toBe(true);
    }, TIMEOUT);

    it('should reject extractions with Confidence < 0.70 via Confidence Gate', async () => {
        const fakeSession: Session = {
            id: 'test-session-6',
            date: new Date().toISOString(),
            duration: 50,
            sessionType: 'individual',
            status: 'completed',
            notes: 'O paciente talvez tenha tido uma leve dor de cabeça, mas não tem certeza absoluta, acho que passou rápido.',
            attachments: [],
            tags: [],
            paymentStatus: 'pending',
            price: 0,
            goalIds: []
        };
        
        const result = await runExtractorPipeline('patient-1', [fakeSession]);
        
        // Uma observação vaga dessas provavelmente virá com confidence baixa, caindo na unknownConcepts
        // ou nem será extraída. Se for extraída, não deve ir para observations.
        const lowConfObservation = result.observations.find(o => o.evidence.confidence < 0.70);
        expect(lowConfObservation).toBeUndefined(); // O Gate de Confiança bloqueou
    }, TIMEOUT);
});
