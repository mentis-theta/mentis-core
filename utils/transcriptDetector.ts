/**
 * Configuração de pesos para o detector de transcrição.
 * Isso evita "números mágicos" hardcoded no código e facilita calibração futura.
 */
export const TranscriptDetectorConfig = {
    // Pesos (0 a 100)
    WEIGHT_TIMESTAMPS: 30,
    WEIGHT_SPEECH_ALTERNATION: 25,
    WEIGHT_MANY_SHORT_LINES: 20,
    WEIGHT_LARGE_VOLUME: 15,

    // Limiares
    THRESHOLD_LARGE_VOLUME: 6000,
    THRESHOLD_IS_TRANSCRIPT: 70, // Se score >= 70, consideramos transcrição
};

export interface TranscriptDetectorResult {
    isTranscript: boolean;
    score: number;
    reasons: string[];
}

/**
 * Avalia se um determinado texto (ex: vindo de um clipboard/paste) tem
 * características estruturais de uma transcrição bruta de sessão.
 */
export function detectTranscript(text: string): TranscriptDetectorResult {
    let score = 0;
    const reasons: string[] = [];

    if (!text) {
        return { isTranscript: false, score: 0, reasons: [] };
    }

    // 1. Volume Longo
    if (text.length > TranscriptDetectorConfig.THRESHOLD_LARGE_VOLUME) {
        score += TranscriptDetectorConfig.WEIGHT_LARGE_VOLUME;
        reasons.push('volume_alto');
    }

    // 2. Timestamps frequentes
    // Ex: [00:15], 12:30, [01:05:22]
    const timestampMatches = text.match(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g);
    if (timestampMatches && timestampMatches.length >= 5) {
        score += TranscriptDetectorConfig.WEIGHT_TIMESTAMPS;
        reasons.push('timestamps_frequentes');
    }

    // 3. Alternância de interlocutores
    // Ex: "Paciente:", "Psicólogo:", "Dr.:", "Ana:"
    // Procuramos linhas que começam com "Nome:" ou "Pessoa 1:"
    const speakerPattern = /^\s*(?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)?(?:[A-Z][a-z0-9à-ú]+(?:\s[A-Z][a-z0-9à-ú]+){0,2}|Paciente|Psicólogo|Terapeuta|Dr\.?)\s*:/gm;
    const speakerMatches = text.match(speakerPattern);
    if (speakerMatches && speakerMatches.length >= 5) {
        score += TranscriptDetectorConfig.WEIGHT_SPEECH_ALTERNATION;
        reasons.push('alternancia_falas');
    }

    // 4. Fragmentação (Muitas linhas curtas)
    // Transcrições de fala frequentemente possuem várias falas/linhas curtas devido à interrupções.
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 50) {
        const shortLines = lines.filter(line => line.trim().length < 80);
        if (shortLines.length / lines.length > 0.6) {
            score += TranscriptDetectorConfig.WEIGHT_MANY_SHORT_LINES;
            reasons.push('fragmentacao_linhas');
        }
    }

    return {
        isTranscript: score >= TranscriptDetectorConfig.THRESHOLD_IS_TRANSCRIPT,
        score,
        reasons
    };
}
