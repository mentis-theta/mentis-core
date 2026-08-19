import { describe, it, expect } from 'vitest';
import { detectTranscript, TranscriptDetectorConfig } from './transcriptDetector';

describe('TranscriptDetector', () => {

    it('should not detect small plain text as transcript', () => {
        const text = "O paciente relatou que está dormindo mal. Acorda às 3h da manhã.";
        const result = detectTranscript(text);
        expect(result.isTranscript).toBe(false);
        expect(result.score).toBe(0);
    });

    it('should detect a typical raw transcript with timestamps and speakers', () => {
        const text = `
Psicólogo: Olá João, como foi a semana?
[00:15] Paciente: Ah, foi um pouco corrida. Muitas reuniões.
[00:30] Psicólogo: Entendo. E aquele conflito no trabalho?
[00:45] Paciente: Acabou se resolvendo. Falei com meu chefe.
[01:00] Psicólogo: Que ótimo. Como você se sentiu?
[01:10] Paciente: Aliviado, confesso. Achei que ele ia brigar.
        `.trim();
        
        // This text is small, so no volume score.
        // It has 5 timestamps -> +30
        // It has 6 speakers -> +25
        // It has many short lines but lines count is 6, which is < 50, so no fragmentation score.
        // Total score = 55. Not enough for 70 (isTranscript = false).
        
        const result = detectTranscript(text);
        expect(result.score).toBe(
            TranscriptDetectorConfig.WEIGHT_TIMESTAMPS + 
            TranscriptDetectorConfig.WEIGHT_SPEECH_ALTERNATION
        );
        expect(result.isTranscript).toBe(false); // Threshold is 70
    });

    it('should detect a full transcript (large volume, timestamps, speakers, fragmented)', () => {
        let text = "";
        for (let i = 0; i < 30; i++) {
            text += `Psicólogo: Pergunta curta ${i}.\n`;
            text += `[00:15] Paciente: Resposta curta ${i}.\n`;
        }
        
        // Now it has 60 lines. 60 short lines out of 60.
        // It has 30 timestamps.
        // It has 60 speakers.
        // Length might still be < 6000, let's artificially inflate length:
        text += "a".repeat(7000);

        const result = detectTranscript(text);
        
        expect(result.isTranscript).toBe(true);
        expect(result.reasons).toContain('volume_alto');
        expect(result.reasons).toContain('timestamps_frequentes');
        expect(result.reasons).toContain('alternancia_falas');
        expect(result.reasons).toContain('fragmentacao_linhas');
        
        expect(result.score).toBe(
            TranscriptDetectorConfig.WEIGHT_LARGE_VOLUME +
            TranscriptDetectorConfig.WEIGHT_TIMESTAMPS +
            TranscriptDetectorConfig.WEIGHT_SPEECH_ALTERNATION +
            TranscriptDetectorConfig.WEIGHT_MANY_SHORT_LINES
        ); // 90
    });
});
