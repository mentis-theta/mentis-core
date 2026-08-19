import { Session, SessionEvidence } from '../../types';
import { getPlainTextFromSession } from '../../components/Session/RichTextRenderer';
import { dispatch_clinical_events } from '../ops/eventBus';

export function extractSessionEvidence(session: Session): SessionEvidence {
    // 1. Prioridade Máxima: Notes finalizada E validada
    if (session.status === 'completed' && session.finalized_at && session.notes) {
        const text = typeof session.notes === 'string' ? session.notes : getPlainTextFromSession(session.notes);
        
        if (text.length < 15000) {
            return {
                extractionText: text,
                source: 'notes',
                quality: 'HIGH',
                wasChunked: false,
                wasFallback: false,
                charCount: text.length
            };
        }
        
        // Log telemetry
        dispatch_clinical_events({
            type: 'TELEMETRY',
            level: 'warn',
            message: 'Evolução finalizada com > 15k chars. Tratada como transcrição.',
            metadata: { sessionId: session.id, charCount: text.length }
        });
    }

    // 2. Resumo Clínico Estruturado (IA)
    if (session.resumo_sessao) {
        return {
            extractionText: session.resumo_sessao,
            source: 'summary',
            quality: 'HIGH',
            wasChunked: false,
            wasFallback: false, 
            charCount: session.resumo_sessao.length
        };
    }

    // 3. Draft Notes
    if (session.draft_notes || session.notes) {
        const content = session.draft_notes || session.notes;
        const text = typeof content === 'string' ? content : getPlainTextFromSession(content);
        if (text.length < 15000 && text.trim().length > 0) {
            return {
                extractionText: text,
                source: 'draft',
                quality: 'MEDIUM',
                wasChunked: false,
                wasFallback: true,
                fallbackReason: 'summary_missing',
                charCount: text.length
            };
        }
    }

    // 4. Transcrição (se existir) ou Fallback Geral
    const fallbackText = session.transcript || (typeof session.notes === 'string' ? session.notes : getPlainTextFromSession(session.notes || ''));
    
    // Log telemetry para fallback pesado
    dispatch_clinical_events({
        type: 'TELEMETRY',
        level: 'info',
        message: 'Utilizando transcrição como fallback.',
        metadata: { sessionId: session.id, charCount: fallbackText.length }
    });

    return {
        extractionText: fallbackText,
        source: session.transcript ? 'transcript' : 'notes',
        quality: 'LOW',
        wasChunked: fallbackText.length >= 15000,
        wasFallback: true,
        fallbackReason: fallbackText.length >= 15000 && session.status === 'completed' ? 'notes_too_large' : 'transcript_only',
        charCount: fallbackText.length
    };
}
