import { RiasecType } from './riasecItems';
import { VOCATIONAL_COLORS } from '../../utils/colorTokens';

export interface RiasecScore {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
  hollandCode: string;
  primaryType: RiasecType;
  secondaryType: RiasecType;
  tertiaryType: RiasecType;
  differentiationIndex: number;
}

/**
 * Mapeamento da distância no hexágono de Holland.
 * O hexágono clássico é R-I-A-S-E-C.
 * Distâncias: 
 * 3 (Adjacente = alta consistência)
 * 2 (Alternado = média consistência)
 * 1 (Oposto = baixa consistência)
 */
const HEXAGON_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'];

function calculateConsistency(type1: string, type2: string): number {
  if (!type1 || !type2) return 0;
  const i1 = HEXAGON_ORDER.indexOf(type1);
  const i2 = HEXAGON_ORDER.indexOf(type2);
  let distance = Math.abs(i1 - i2);
  if (distance > 3) {
    distance = 6 - distance;
  }
  // Distância 1 no hexágono (adjacentes) -> consistência 3
  // Distância 2 (alternados) -> consistência 2
  // Distância 3 (opostos) -> consistência 1
  return 4 - distance;
}

export function scoreRiasec(responses: { type: RiasecType; value: number }[]): RiasecScore {
  // Inicializar scores
  const scores: Record<RiasecType, number> = {
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0
  };

  // Somar os valores da escala Likert (1-5)
  responses.forEach(r => {
    scores[r.type] += r.value;
  });

  // Ordenar para extrair o código Holland
  const sorted = Object.entries(scores)
    .map(([type, score]) => ({ type: type as RiasecType, score }))
    .sort((a, b) => b.score - a.score);

  const primary = sorted[0];
  const secondary = sorted[1];
  const tertiary = sorted[2];
  const lowest = sorted[sorted.length - 1];

  // Differentiation = Maior - Menor score
  const differentiationIndex = primary.score - lowest.score;

  return {
    R: scores.R,
    I: scores.I,
    A: scores.A,
    S: scores.S,
    E: scores.E,
    C: scores.C,
    hollandCode: `${primary.type}${secondary.type}${tertiary.type}`,
    primaryType: primary.type,
    secondaryType: secondary.type,
    tertiaryType: tertiary.type,
    differentiationIndex,
  };
}

export const RIASEC_TYPE_LABELS: Record<RiasecType, { name: string; color: string; description: string }> = {
  R: { name: 'Realista', color: VOCATIONAL_COLORS.realistic, description: 'Gosta de atividades práticas, trabalho com ferramentas, máquinas e ao ar livre. Valoriza coisas que se pode ver e tocar.' },
  I: { name: 'Investigativo', color: VOCATIONAL_COLORS.investigative, description: 'Gosta de analisar problemas, observar, aprender, investigar e resolver questões matemáticas ou científicas.' },
  A: { name: 'Artístico', color: VOCATIONAL_COLORS.artistic, description: 'Gosta de ambientes não estruturados, usar imaginação e criatividade em trabalhos como design, arte ou escrita.' },
  S: { name: 'Social', color: VOCATIONAL_COLORS.social, description: 'Gosta de ensinar, curar, orientar e ajudar os outros. Valoriza relações humanas e empatia.' },
  E: { name: 'Empreendedor', color: VOCATIONAL_COLORS.enterprising, description: 'Gosta de liderar, persuadir e gerenciar pessoas para alcançar objetivos organizacionais ou ganhos econômicos.' },
  C: { name: 'Convencional', color: VOCATIONAL_COLORS.conventional, description: 'Gosta de trabalhar com dados, seguir procedimentos claros e organizar detalhes, operando em ambientes estruturados.' },
};
