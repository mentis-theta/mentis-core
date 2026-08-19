export type StroopCondition = 'congruent' | 'incongruent' | 'neutral';
export type StroopColor = 'red' | 'blue' | 'green' | 'yellow';

// Textos em português neutros para a condição neutra
const NEUTRAL_WORDS = ['PORTA', 'CARRO', 'MESA', 'LIVRO', 'PEDRA', 'FESTA', 'TEMPO', 'NUVEM'];

export interface StroopTrial {
  word: string;          // O texto exibido
  color: StroopColor;    // A cor da tinta
  condition: StroopCondition;
  expectedColor: StroopColor; // A resposta correta (sempre a cor da tinta)
}

const COLORS: StroopColor[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_WORDS: Record<StroopColor, string> = {
  red: 'VERMELHO',
  blue: 'AZUL',
  green: 'VERDE',
  yellow: 'AMARELO',
};

/**
 * Gera um número aleatório (usando Math.random, já que não precisamos reproduzir seeds exatas no front,
 * mas seguimos a regra de distribuição rígida pseudo-aleatória)
 */
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gera 100 trials: 40 congruentes, 40 incongruentes, 20 neutros.
 * Garante que não haja mais de 3 trials seguidos da mesma condição.
 */
export function generateStroopTrials(): StroopTrial[] {
  const trialPool: StroopCondition[] = [
    ...Array(40).fill('congruent'),
    ...Array(40).fill('incongruent'),
    ...Array(20).fill('neutral')
  ];

  // Fisher-Yates shuffle
  for (let i = trialPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trialPool[i], trialPool[j]] = [trialPool[j], trialPool[i]];
  }

  // Corrigir violações de "max 3 em sequência"
  let isValid = false;
  while (!isValid) {
    isValid = true;
    for (let i = 2; i < trialPool.length; i++) {
      if (trialPool[i] === trialPool[i - 1] && trialPool[i] === trialPool[i - 2] && trialPool[i] === trialPool[i - 3]) {
        // Encontrou 4 seguidos, troca o 4º com algum aleatório mais pra frente
        isValid = false;
        let swapIdx = i + 1 + Math.floor(Math.random() * (trialPool.length - i - 1));
        if (swapIdx >= trialPool.length) swapIdx = trialPool.length - 1;
        [trialPool[i], trialPool[swapIdx]] = [trialPool[swapIdx], trialPool[i]];
      }
    }
  }

  // Mapear cada condition para o objeto Trial final
  let lastColor: StroopColor | null = null;
  let lastWord: string | null = null;

  return trialPool.map(condition => {
    let color = getRandomItem(COLORS);
    // Tenta não repetir a mesma cor de tinta seguida
    while (color === lastColor) {
      color = getRandomItem(COLORS);
    }
    lastColor = color;

    let word = '';
    if (condition === 'congruent') {
      word = COLOR_WORDS[color];
    } else if (condition === 'neutral') {
      word = getRandomItem(NEUTRAL_WORDS);
      while (word === lastWord) {
        word = getRandomItem(NEUTRAL_WORDS);
      }
      lastWord = word;
    } else {
      // Incongruente: a palavra não pode ser a própria cor
      let mismatchedWordColor = getRandomItem(COLORS);
      while (mismatchedWordColor === color) {
        mismatchedWordColor = getRandomItem(COLORS);
      }
      word = COLOR_WORDS[mismatchedWordColor];
    }

    return {
      word,
      color,
      condition,
      expectedColor: color
    };
  });
}
