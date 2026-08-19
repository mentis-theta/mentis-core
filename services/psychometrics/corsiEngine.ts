/**
 * Coordenadas percentuais (0-100) para os 9 blocos do teste de Corsi Clássico.
 * Essa disposição assimétrica previne padrões fáceis de memorização (gestalt).
 */
export const CORSI_BLOCKS = [
  { id: 1, x: 15, y: 15 },
  { id: 2, x: 80, y: 10 },
  { id: 3, x: 45, y: 25 },
  { id: 4, x: 10, y: 50 },
  { id: 5, x: 70, y: 45 },
  { id: 6, x: 30, y: 65 },
  { id: 7, x: 90, y: 75 },
  { id: 8, x: 15, y: 85 },
  { id: 9, x: 55, y: 85 },
];

export interface CorsiTrial {
  span: number;
  sequence: number[]; // IDs dos blocos (1-9)
}

/**
 * Gera as sequências pseudo-aleatórias para o teste.
 * 2 tentativas por Span, começando em Span = 2.
 * (O limite teórico do span humano é 9, mas geramos até 9 por segurança).
 */
export function generateCorsiSequences(maxSpan = 9): CorsiTrial[] {
  const trials: CorsiTrial[] = [];
  
  for (let span = 2; span <= maxSpan; span++) {
    // 2 tentativas por span
    for (let t = 0; t < 2; t++) {
      const sequence: number[] = [];
      let lastBlock = -1;

      // Gera a sequência para este trial
      for (let i = 0; i < span; i++) {
        let blockId;
        // Evita que o mesmo bloco pisque duas vezes seguidas
        do {
          blockId = Math.floor(Math.random() * 9) + 1;
        } while (blockId === lastBlock);
        
        sequence.push(blockId);
        lastBlock = blockId;
      }
      
      trials.push({ span, sequence });
    }
  }
  
  return trials;
}
