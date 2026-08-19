import type { CognitiveTaskEvent } from '../../types';

export interface CorsiScore {
  directSpan: number;
  totalCorrectTrials: number;
  totalTrials: number;
  maxSpanAttempted: number;
}

/**
 * Filtra e processa os dados brutos capturados no CorsiTask.
 * Um 'acerto' no Corsi é quando todas as respostas do trial correspondem exatamente à sequência original (expected).
 */
export function scoreCorsi(events: CognitiveTaskEvent[]): CorsiScore {
  if (events.length === 0) {
    return { directSpan: 0, totalCorrectTrials: 0, totalTrials: 0, maxSpanAttempted: 0 };
  }

  let totalCorrectTrials = 0;
  let directSpan = 0;
  let maxSpanAttempted = 0;

  // No Corsi, cada CognitiveTaskEvent gravado representa o resultado completo de UM TRIAL,
  // onde 'response' é a string/array da sequência clicada, e 'expected' é a sequência-alvo.
  // E o 'isCorrect' já avalia se as sequências são idênticas.
  // (Na arquitetura do CorsiTask, salvaremos 1 evento por Trial, gravando as latências intra-clique em metadata).

  for (const ev of events) {
    const span = ev.level || 0;
    if (span > maxSpanAttempted) {
      maxSpanAttempted = span;
    }

    if (ev.isCorrect) {
      totalCorrectTrials++;
      if (span > directSpan) {
        directSpan = span; // Atualiza o Span máximo alcançado com sucesso
      }
    }
  }

  return {
    directSpan,
    totalCorrectTrials,
    totalTrials: events.length,
    maxSpanAttempted
  };
}
