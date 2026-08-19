import { Session, ExtractionResult } from '../../types';
import { extractCandidates } from './candidateExtractor';
import { resolveConcepts } from './ontologyResolver';
import { classifyEvidence } from './evidenceClassifier';
import { AI_MODELS } from '../../config/ai_models.ts';
import { buildObservations } from './observationBuilder';
import { eventBus } from '../ops/eventBus';

/**
 * Pipeline Oficial de Extração (Extrator Mestre)
 * Combina todos os submódulos da Camada 1 para retornar o ExtractionResult (Contrato).
 */
export async function runExtractorPipeline(patientId: string, sessions: Session[]): Promise<ExtractionResult> {
    const start = Date.now();
    const warnings: any[] = [];
    
    // 1. Extrai as hipóteses baseadas no texto livre (LLM Parser)
    const { candidates, metadata: meta1 } = await extractCandidates(sessions);
    
    // 2. Tenta ancorar na ontologia fixa (Confidence Gate incluso)
    const resolved = resolveConcepts(candidates, warnings);
    
    // Separa os unknown (que falharam no gate ou não existem na ontologia)
    const unknownConcepts = resolved
        .filter(r => r.conceptId === 'unknown')
        .map(r => r.candidate);

    const sessionIds = sessions.map(s => s.id);

    // Despacha os unknown concepts para a fila de curadoria no banco via EventBus
    if (unknownConcepts.length > 0) {
        const unknownEvents = unknownConcepts.map(c => ({
            type: 'unknown_concept' as const,
            term: c.suggestedConcept,
            context: 'Extraído durante análise de sessão'
        }));
        eventBus.publishBatch(unknownEvents);
    }

    // 3. Classifica as evidências para os conceitos válidos (LLM Classifier)
    const { classifications: classified, metadata: meta2 } = await classifyEvidence(resolved, sessionIds);
    
    // 4. Constrói o objeto de observação imutável final
    const observations = buildObservations(patientId, classified);

    const durationMs = Date.now() - start;

    return {
        sessionId: sessionIds.join(','),
        patientId,
        metadata: {
            extractorVersion: '1.0.0',
            ontologyVersion: '1.0.0',
            model: AI_MODELS.REASONING_TASKS,
            extractedAt: new Date().toISOString(),
            durationMs,
            telemetry: {
                promptTokenCount: (meta1?.promptTokenCount || 0) + (meta2?.promptTokenCount || 0),
                candidatesTokenCount: (meta1?.candidatesTokenCount || 0) + (meta2?.candidatesTokenCount || 0),
                totalTokenCount: (meta1?.totalTokenCount || 0) + (meta2?.totalTokenCount || 0),
                latencyMs: (meta1?.latencyMs || 0) + (meta2?.latencyMs || 0),
                modelVersion: meta1?.modelVersion || meta2?.modelVersion || 'unknown'
            }
        },
        concepts: [], // Serão montados/recuperados no Middleware (para preservar histórico)
        observations,
        psychometrics: [], // Poderia chamar o psychometricExtractor aqui
        warnings,
        unknownConcepts
    };
}
