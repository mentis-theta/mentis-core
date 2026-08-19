import { useRef, useCallback } from 'react';

/**
 * Hook de cronometragem de alta resolução usando performance.now().
 * 
 * NUNCA usa Date.now() — performance.now() oferece precisão de ~0.1ms
 * e é monotônico (não é afetado por ajustes de relógio do sistema).
 * 
 * Usado pelos testes Stroop e Corsi para registrar tempos de reação.
 */
export const useHighResTimer = () => {
  const marks = useRef<Map<string, number>>(new Map());

  /** Registra um timestamp de alta resolução com um label */
  const mark = useCallback((label: string): number => {
    const t = performance.now();
    marks.current.set(label, t);
    return t;
  }, []);

  /** Retorna o timestamp registrado para um label */
  const getMark = useCallback((label: string): number | undefined => {
    return marks.current.get(label);
  }, []);

  /** Calcula o delta em ms entre dois marks */
  const elapsed = useCallback((fromLabel: string, toLabel: string): number => {
    const from = marks.current.get(fromLabel);
    const to = marks.current.get(toLabel);
    if (from === undefined || to === undefined) return -1;
    return to - from;
  }, []);

  /** Retorna o tempo atual de alta resolução (sem registrar) */
  const now = useCallback((): number => {
    return performance.now();
  }, []);

  /** Calcula o delta entre um mark e o tempo atual */
  const elapsedSince = useCallback((fromLabel: string): number => {
    const from = marks.current.get(fromLabel);
    if (from === undefined) return -1;
    return performance.now() - from;
  }, []);

  /** Limpa todos os marks (ex: ao iniciar nova sessão de teste) */
  const reset = useCallback(() => {
    marks.current.clear();
  }, []);

  return { mark, getMark, elapsed, now, elapsedSince, reset };
};
