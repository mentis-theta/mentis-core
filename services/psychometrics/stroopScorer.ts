import type { CognitiveTaskEvent } from '../../types';
import type { StroopCondition } from './stroopEngine';

export interface StroopScore {
  totalTrials: number;
  omissions: number;
  
  congruent: { count: number; correct: number; meanRT: number };
  incongruent: { count: number; correct: number; meanRT: number };
  neutral: { count: number; correct: number; meanRT: number };
  
  interferenceEffectMs: number; // Incongruent RT - Neutral RT
  facilitationEffectMs: number; // Neutral RT - Congruent RT
  
  overallAccuracy: number; // 0 a 100
}

function calculateMeanRT(events: CognitiveTaskEvent[]): number {
  if (events.length === 0) return 0;
  const sum = events.reduce((acc, ev) => acc + ev.responseTime, 0);
  return Math.round(sum / events.length);
}

/**
 * Filtros clínicos padrão:
 * - Apenas trials CORRETOS são usados no cálculo de Tempo de Reação.
 * - Trials muito rápidos (< 150ms, provável antecipação) ou muito lentos (> 3000ms, provável distração) 
 *   podem ser aparados. Para rastreio, vamos manter todos corretos exceto RT = 0 (omissão).
 */
export function scoreStroop(events: CognitiveTaskEvent[]): StroopScore {
  const getConditionEvents = (condition: StroopCondition) => 
    events.filter(e => e.condition === condition);

  const getCorrectEvents = (evs: CognitiveTaskEvent[]) => 
    evs.filter(e => e.isCorrect && !e.isOmission && e.responseTime > 150 && e.responseTime < 4000);

  const c_events = getConditionEvents('congruent');
  const i_events = getConditionEvents('incongruent');
  const n_events = getConditionEvents('neutral');

  const c_correct = getCorrectEvents(c_events);
  const i_correct = getCorrectEvents(i_events);
  const n_correct = getCorrectEvents(n_events);

  const c_mean = calculateMeanRT(c_correct);
  const i_mean = calculateMeanRT(i_correct);
  const n_mean = calculateMeanRT(n_correct);

  const omissions = events.filter(e => e.isOmission).length;
  const correctCount = c_correct.length + i_correct.length + n_correct.length;
  const overallAccuracy = events.length > 0 ? (correctCount / events.length) * 100 : 0;

  // Efeito de Interferência Global (Clássico): Incongruente - Congruente
  // Mede o custo inibitório total. Positivo = sofreu interferência.
  const interferenceEffectMs = (i_mean > 0 && c_mean > 0) ? (i_mean - c_mean) : 0;

  // Efeito de Facilitação: Neutro - Congruente
  // Mede o benefício da congruência. Positivo = leu mais rápido porque a cor bate.
  const facilitationEffectMs = (n_mean > 0 && c_mean > 0) ? (n_mean - c_mean) : 0;

  return {
    totalTrials: events.length,
    omissions,
    congruent: { count: c_events.length, correct: c_correct.length, meanRT: c_mean },
    incongruent: { count: i_events.length, correct: i_correct.length, meanRT: i_mean },
    neutral: { count: n_events.length, correct: n_correct.length, meanRT: n_mean },
    interferenceEffectMs,
    facilitationEffectMs,
    overallAccuracy: Number(overallAccuracy.toFixed(2))
  };
}
