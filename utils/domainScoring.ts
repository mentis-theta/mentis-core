import { type ScaleName } from './assessmentScales';

/**
 * Determina se uma resposta específica atinge o limiar de atenção clínica (cutoff).
 * Evita o viés numérico bruto, utilizando a regra científica de cada escala.
 */
export function isClinicallyNotable(
  scaleId: ScaleName,
  questionIndex: number,
  rawValue: number | null
): boolean {
  if (rawValue === null || rawValue === undefined) return false;

  switch (scaleId) {
    case 'ASRS-18': {
      // Itens 1, 2, 3, 9, 12, 16, 18 (índices 0, 1, 2, 8, 11, 15, 17): cutoff >= 2 (Algumas vezes)
      const group1 = [0, 1, 2, 8, 11, 15, 17];
      // Demais itens: cutoff >= 3 (Frequentemente)
      if (group1.includes(questionIndex)) {
        return rawValue >= 2;
      }
      return rawValue >= 3;
    }

    case 'AQ-10': {
      // Cutoff: ganha 1 ponto se cair na área de traço autista
      const directItems = [0, 6, 7, 9]; // Concordo (2 ou 3)
      const invertedItems = [1, 2, 3, 4, 5, 8]; // Discordo (0 ou 1)

      if (directItems.includes(questionIndex)) return rawValue >= 2;
      if (invertedItems.includes(questionIndex)) return rawValue <= 1;
      return false;
    }

    case 'CBI': {
      // 0, 25, 50, 75, 100. Acima de 50 já é indicativo de exaustão frequente.
      return rawValue >= 50;
    }

    case 'C-SSRS': {
      // Risco suicida: qualquer "Sim" (1) é notável.
      return rawValue === 1;
    }

    case 'MDQ': {
      // Perguntas 1-13 (Sim=1/Não=0)
      // Pergunta 14 (Sim=1/Não=0) - Ocorreram juntos
      // Pergunta 15 (0=Nenhum, 1=Leve, 2=Moderado, 3=Grave)
      if (questionIndex === 14) return rawValue >= 2; // Problemas moderados ou graves
      return rawValue === 1; // Qualquer "Sim" no screening
    }

    case 'PHQ-9':
    case 'GAD-7':
    case 'PCL-5':
    case 'SNAP-IV':
    case 'DASS-21':
    case 'SPIN':
    case 'ISI': {
      // Escalas Likert 0-3 ou 0-4 onde maior é pior. 
      // Geralmente, "Mais da metade dos dias", "Considerável", "Muito" (2 ou 3) em diante é notável.
      return rawValue >= 2;
    }

    case 'MSI-BPD': {
      return rawValue === 1; // Verdadeiro
    }

    case 'BPQ': {
      const invertedItems = [9, 42, 27, 3, 44, 59, 51, 66, 52, 53, 7, 31, 47]; 
      if (invertedItems.includes(questionIndex)) {
        return rawValue === 0; // Falso é a resposta de risco
      }
      return rawValue === 1; // Verdadeiro é a resposta de risco
    }

    case 'PSS-10': {
      // Escala 0-4 (com perguntas invertidas). Vamos considerar valores altos de estresse (3 ou 4 na conversão).
      // Mas rawValue passado aqui NÃO é invertido (é a resposta bruta do paciente).
      const invert = [3, 4, 6, 7];
      if (invert.includes(questionIndex)) {
        return rawValue <= 1; // Respondeu "Nunca" ou "Quase Nunca" para sensação de controle
      }
      return rawValue >= 3; // Respondeu "Frequentemente" ou "Muito" para sobrecarga
    }

    case 'OCI-R': {
      // Likert 0-4. 0=Nada, 1=Um pouco, 2=Moderadamente, 3=Muito, 4=Muitíssimo
      return rawValue >= 2;
    }

    case 'Pfeffer': {
      // Likert 0-3. 0=Normal, 1=Com dificuldade, 2=Requer assistência, 3=Incapaz
      // Qualquer grau de dificuldade (>= 1) é notável num rastreio cognitivo funcional.
      return rawValue >= 1;
    }

    default:
      // Fallback conservador para outras escalas baseadas em soma
      return rawValue >= 2;
  }
}
