import { MiddlewareResult } from '../../types';

const CPF_REGEX = /[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}\-?[0-9]{2}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\(?\d{2}\)?\s?)?\d{4,5}\-?\d{4}/g;

/**
 * Anonymizer (Camada 2 - Middleware)
 * Remove Informações Pessoais Identificáveis (PII) estruturadas 
 * (CPF, Email, Telefone) de textos soltos, principalmente da fila de Unknowns.
 */
export function anonymizePII(input: MiddlewareResult): MiddlewareResult {
    const { result, issues, events } = input;
    let anonymizedCount = 0;

    const sanitize = (text: string) => {
        let newText = text;
        const initialLength = newText.length;
        
        newText = newText.replace(CPF_REGEX, '[CPF_REMOVED]');
        newText = newText.replace(EMAIL_REGEX, '[EMAIL_REMOVED]');
        newText = newText.replace(PHONE_REGEX, '[PHONE_REMOVED]');
        
        // Simples detecção para acionar o evento
        if (newText !== text) {
            anonymizedCount++;
        }
        
        return newText;
    };

    // UnknownConcepts é onde PII vaza com mais frequência
    const sanitizedUnknowns = result.unknownConcepts.map(candidate => ({
        ...candidate,
        rawText: sanitize(candidate.rawText),
        context: candidate.context ? sanitize(candidate.context) : undefined
    }));

    if (anonymizedCount > 0) {
        events.push({
            type: 'PII_Anonymized',
            payload: { count: anonymizedCount, patientId: result.patientId },
            timestamp: new Date().toISOString()
        });
    }

    return {
        result: {
            ...result,
            unknownConcepts: sanitizedUnknowns
        },
        issues,
        events
    };
}
