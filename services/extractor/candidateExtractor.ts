import { Session, CandidateConcept, CallMetadata } from '../../types';
import { callGeminiAPI, parseLLMJSON } from '../../utils/aiUtils';
import { extractSessionEvidence } from './evidenceSourceManager';
import { dispatch_clinical_events } from '../ops/eventBus';

const CHUNK_SIZE = 12000; // Safe limit under 15k

async function processExtractionChunk(text: string, sessionId: string, dateStr: string): Promise<{ candidates: CandidateConcept[], metadata?: CallMetadata }> {
    const prompt = `Você é um EXTRATOR DE DADOS CLÍNICOS. Você atua no "Modo Parser".
Sua função NÃO é analisar, julgar ou criar relatórios. Sua ÚNICA função é converter evidências textuais puras em hipóteses de extração (candidatos).

REGRAS RÍGIDAS:
1. Nunca invente conceitos. Apenas extraia.
2. Identifique a hipótese no formato "dominio.conceito" (ex: "sleep.insomnia"). Se não souber, preencha ESTRITAMENTE com "unknown".
3. Extraia o "rawText" exato que originou o conceito (copie a frase literal).
4. Forneça o contexto (a frase inteira ou parágrafo).
5. Atribua um grau de confiança estatística de extração (confidence) de 0.0 a 1.0.

TEXTO FONTE:
[Sessão: ${sessionId} | Data: ${dateStr}]
${text}

Devolva ESTRITAMENTE um array JSON:
[
  {
    "rawText": "A frase curta",
    "suggestedConcept": "sleep.insomnia",
    "confidence": 0.95,
    "context": "Paciente refere não conseguir dormir há semanas devido à preocupação."
  }
]
Sem markdown. Apenas o array válido.`;

    const { text: generatedText, metadata } = await callGeminiAPI(prompt, true);
    
    try {
        let parsed = parseLLMJSON<any>(generatedText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const arrayValue = Object.values(parsed).find(v => Array.isArray(v));
            if (arrayValue) parsed = arrayValue;
        }
        if (!Array.isArray(parsed)) return { candidates: [], metadata };
        return { candidates: parsed as CandidateConcept[], metadata };
    } catch (e) {
        console.error('Falha ao processar a extração de candidatos no chunk.', e);
        return { candidates: [], metadata };
    }
}

export async function extractCandidates(sessions: Session[]): Promise<{ candidates: CandidateConcept[], metadata?: CallMetadata }> {
    if (!sessions || sessions.length === 0) return { candidates: [] };
    
    let allCandidates: CandidateConcept[] = [];
    let lastMetadata: CallMetadata | undefined;

    for (const session of sessions) {
        const evidence = extractSessionEvidence(session);
        const textToProcess = evidence.extractionText;
        const dateStr = new Date(session.date).toLocaleDateString('pt-BR');

        if (evidence.wasChunked) {
            dispatch_clinical_events({
                type: 'TELEMETRY',
                level: 'warn',
                message: 'Extração por chunking ativada para sessão (Fallback).',
                metadata: { sessionId: session.id, charCount: evidence.charCount, reason: evidence.fallbackReason }
            });

            // Splitting into chunks
            let currentOffset = 0;
            while (currentOffset < textToProcess.length) {
                const chunk = textToProcess.substring(currentOffset, currentOffset + CHUNK_SIZE);
                const { candidates, metadata } = await processExtractionChunk(chunk, session.id, dateStr);
                allCandidates.push(...candidates);
                if (metadata) lastMetadata = metadata;
                currentOffset += CHUNK_SIZE;
            }
        } else {
            const { candidates, metadata } = await processExtractionChunk(textToProcess, session.id, dateStr);
            allCandidates.push(...candidates);
            if (metadata) lastMetadata = metadata;
        }
    }

    return { candidates: allCandidates, metadata: lastMetadata };
}
