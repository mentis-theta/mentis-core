// ============================================================================
// Dados oficiais das escalas (domínio público)
// Perguntas fiéis aos instrumentos originais validados em português.
// ============================================================================

import { CLINICAL_SEVERITY_COLORS, SEMANTIC_COLORS } from './colorTokens';

export interface ScaleQuestion {
  index: number;
  text: string;
  domain: string;
  answerOptions?: { value: number; label: string }[];
  showIf?: (responses: (number | null)[]) => boolean;
}

export interface SeverityInterpretation {
  label: string;
  color: string;
  interpretation: string;
  recommendation: string;
}

export type ScaleName = 'PHQ-9' | 'GAD-7' | 'ASRS-18' | 'MDQ' | 'C-SSRS' | 'CBI' | 'AQ-10' | 'SNAP-IV' | 'OCI-R' | 'PCL-5' | 'Pfeffer' | 'PSS-10' | 'DASS-21' | 'SPIN' | 'ISI' | 'MSI-BPD' | 'ASSIST' | 'BPQ';

export interface ScaleDefinition {
  id: ScaleName;
  name: string;
  description: string;
  instruction: string;
  questions: ScaleQuestion[];
  answerOptions: { value: number; label: string }[]; // Default para a escala
  severityRanges?: { min: number; max: number; label: string; color: string; interpretation: string; recommendation: string }[];
  
  // Funções customizadas para escalas complexas (MDQ, ASRS, C-SSRS)
  customScoreCalculation?: (responses: (number | null)[]) => number;
  customSeverityInterpretation?: (responses: (number | null)[], score: number) => SeverityInterpretation;
}

// ============================================================================
// OPÇÕES COMPARTILHADAS
// ============================================================================
const SHARED_LIKERT_0_3 = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

const SHARED_YES_NO = [
  { value: 0, label: 'Não' },
  { value: 1, label: 'Sim' },
];

// ============================================================================
// PHQ-9 & GAD-7 (Existentes)
// ============================================================================

export const PHQ9: ScaleDefinition = {
  id: 'PHQ-9',
  name: 'PHQ-9 (Depressão)',
  description: 'Questionário sobre a Saúde do Paciente - 9',
  instruction: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por qualquer um dos problemas a seguir?',
  questions: [
    { index: 0, text: 'Pouco interesse ou pouco prazer em fazer as coisas', domain: 'Anedonia' },
    { index: 1, text: 'Se sentir "para baixo", deprimido(a) ou sem perspectiva', domain: 'Humor' },
    { index: 2, text: 'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume', domain: 'Sono' },
    { index: 3, text: 'Se sentir cansado(a) ou com pouca energia', domain: 'Energia' },
    { index: 4, text: 'Falta de apetite ou comendo demais', domain: 'Apetite' },
    { index: 5, text: 'Se sentir mal consigo mesmo(a) — ou achar que você é um fracasso ou que decepcionou sua família ou você mesmo(a)', domain: 'Autoestima' },
    { index: 6, text: 'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão', domain: 'Concentração' },
    { index: 7, text: 'Lentidão para se movimentar ou falar, a ponto das outras pessoas perceberem. Ou o contrário: estar tão agitado(a) ou inquieto(a) que você fica andando de um lado para outro mais do que de costume', domain: 'Psicomotricidade' },
    { index: 8, text: 'Pensar em se machucar de alguma maneira ou que seria melhor estar morto(a)', domain: 'Ideação Suicida' },
  ],
  answerOptions: SHARED_LIKERT_0_3,
  severityRanges: [
    { min: 0, max: 4, label: 'Mínima', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Sintomas mínimos.', recommendation: 'Rotina.' },
    { min: 5, max: 9, label: 'Leve', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Sintomas leves.', recommendation: 'Monitoramento.' },
    { min: 10, max: 14, label: 'Moderada', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Sintomas moderados.', recommendation: 'TCC.' },
    { min: 15, max: 19, label: 'Mod. Grave', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Sintomas moderadamente graves.', recommendation: 'TCC + Farmacoterapia.' },
    { min: 20, max: 27, label: 'Grave', color: CLINICAL_SEVERITY_COLORS.critical, interpretation: 'Sintomas graves.', recommendation: 'Urgente psiquiatra.' },
  ],
};

export const GAD7: ScaleDefinition = {
  id: 'GAD-7',
  name: 'GAD-7 (Ansiedade)',
  description: 'Escala de Transtorno de Ansiedade Generalizada - 7',
  instruction: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos problemas a seguir?',
  questions: [
    { index: 0, text: 'Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)', domain: 'Nervosismo' },
    { index: 1, text: 'Não ser capaz de impedir ou de controlar as preocupações', domain: 'Controle' },
    { index: 2, text: 'Preocupar-se muito com diversas coisas', domain: 'Preocupação' },
    { index: 3, text: 'Dificuldade para relaxar', domain: 'Relaxamento' },
    { index: 4, text: 'Ficar tão agitado(a) que se torna difícil permanecer sentado(a)', domain: 'Agitação' },
    { index: 5, text: 'Ficar facilmente aborrecido(a) ou irritado(a)', domain: 'Irritabilidade' },
    { index: 6, text: 'Sentir medo como se algo horrível pudesse acontecer', domain: 'Medo' },
  ],
  answerOptions: SHARED_LIKERT_0_3,
  severityRanges: [
    { min: 0, max: 4, label: 'Mínima', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Ansiedade mínima.', recommendation: 'Rotina.' },
    { min: 5, max: 9, label: 'Leve', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Ansiedade leve.', recommendation: 'Psicoeducação.' },
    { min: 10, max: 14, label: 'Moderada', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Ansiedade moderada.', recommendation: 'TCC indicada.' },
    { min: 15, max: 21, label: 'Grave', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Ansiedade grave.', recommendation: 'Psiquiatria + TCC.' },
  ],
};

// ============================================================================
// ASRS-18 (TDAH Adulto)
// ============================================================================
const ASRS_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Raramente' },
  { value: 2, label: 'Algumas vezes' },
  { value: 3, label: 'Frequentemente' },
  { value: 4, label: 'Muito frequentemente' },
];

export const ASRS18: ScaleDefinition = {
  id: 'ASRS-18',
  name: 'ASRS-18 (TDAH Adultos)',
  description: 'Adult ADHD Self-Report Scale v1.1',
  instruction: 'Por favor, responda às perguntas abaixo baseando-se em como você se sentiu e se comportou nos últimos 6 meses.',
  questions: [
    // Parte A (Triagem)
    { index: 0, text: '1. Com que frequência você tem dificuldade para finalizar os últimos detalhes de uma tarefa, depois de já ter feito as partes mais complicadas?', domain: 'Desatenção (Parte A)' },
    { index: 1, text: '2. Com que frequência você tem dificuldade para manter as coisas em ordem quando precisa realizar uma tarefa que exige organização?', domain: 'Desatenção (Parte A)' },
    { index: 2, text: '3. Com que frequência você tem problemas para se lembrar de compromissos ou obrigações?', domain: 'Desatenção (Parte A)' },
    { index: 3, text: '4. Quando precisa realizar uma tarefa que exige muita concentração, com que frequência você evita ou adia o seu início?', domain: 'Desatenção (Parte A)' },
    { index: 4, text: '5. Com que frequência você fica se mexendo na cadeira ou balançando as mãos ou os pés quando precisa ficar sentado(a) durante um longo período de tempo?', domain: 'Hiperatividade (Parte A)' },
    { index: 5, text: '6. Com que frequência você se sente excessivamente ativo(a) e necessitando fazer coisas, como se estivesse "com o motor ligado"?', domain: 'Hiperatividade (Parte A)' },
    // Parte B (Sintomas adicionais)
    { index: 6, text: '7. Com que frequência você comete erros por descuido quando tem de trabalhar num projeto chato ou difícil?', domain: 'Desatenção (Parte B)' },
    { index: 7, text: '8. Com que frequência você tem dificuldade para manter a atenção quando está fazendo um trabalho chato ou repetitivo?', domain: 'Desatenção (Parte B)' },
    { index: 8, text: '9. Com que frequência você tem dificuldade para se concentrar no que as pessoas dizem, mesmo quando elas estão falando diretamente com você?', domain: 'Desatenção (Parte B)' },
    { index: 9, text: '10. Com que frequência você coloca as coisas fora do lugar ou tem dificuldade de encontrar as coisas em casa ou no trabalho?', domain: 'Desatenção (Parte B)' },
    { index: 10, text: '11. Com que frequência você se distrai com atividades ou barulhos irrelevantes à sua volta?', domain: 'Desatenção (Parte B)' },
    { index: 11, text: '12. Com que frequência você se levanta da cadeira em reuniões ou outras situações em que deveria ficar sentado(a)?', domain: 'Hiperatividade (Parte B)' },
    { index: 12, text: '13. Com que frequência você se sente inquieto(a) ou agitado(a)?', domain: 'Hiperatividade (Parte B)' },
    { index: 13, text: '14. Com que frequência você tem dificuldade para sossegar e relaxar quando tem tempo livre?', domain: 'Hiperatividade (Parte B)' },
    { index: 14, text: '15. Com que frequência você se pega falando demais em situações sociais?', domain: 'Hiperatividade (Parte B)' },
    { index: 15, text: '16. Quando você está conversando, com que frequência você se pega terminando as frases das pessoas antes delas?', domain: 'Impulsividade (Parte B)' },
    { index: 16, text: '17. Com que frequência você tem dificuldade para esperar a sua vez em situações onde é necessário aguardar?', domain: 'Impulsividade (Parte B)' },
    { index: 17, text: '18. Com que frequência você interrompe os outros quando eles estão ocupados?', domain: 'Impulsividade (Parte B)' },
  ],
  answerOptions: ASRS_OPTIONS,
  severityRanges: [
    { min: 0, max: 3, label: 'Abaixo do Limiar', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Sem indícios clínicos fortes de TDAH pela contagem primária.', recommendation: 'Avaliação de rotina.' },
    { min: 4, max: 18, label: 'Altamente Sugestivo', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Sintomas consistentes com TDAH no adulto segundo limiar da OMS.', recommendation: 'Investigação clínica recomendada.' }
  ],
  
  customScoreCalculation: (responses) => {
    // Calculamos o número de itens "positivos" (na área sombreada)
    let score = 0;
    
    // Regras de área sombreada ASRS v1.1:
    // Itens 1, 2, 3, 9, 12, 16, 18: Algumas vezes(2) ou mais
    const itemsGroup1 = [0, 1, 2, 8, 11, 15, 17];
    // Itens 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 17: Frequentemente(3) ou mais
    const itemsGroup2 = [3, 4, 5, 6, 7, 9, 10, 12, 13, 14, 16];
    
    responses.forEach((resp, idx) => {
      if (resp === null) return;
      if (itemsGroup1.includes(idx) && resp >= 2) score++;
      else if (itemsGroup2.includes(idx) && resp >= 3) score++;
    });
    
    return score; // 0 a 18 itens na área sombreada
  },

  customSeverityInterpretation: (responses, score) => {
    // Avalia apenas a Parte A (itens 0 a 5) para a triagem principal
    let partAScore = 0;
    const itemsGroup1A = [0, 1, 2];
    const itemsGroup2A = [3, 4, 5];
    
    for (let i = 0; i <= 5; i++) {
        const resp = responses[i];
        if (resp === null) continue;
        if (itemsGroup1A.includes(i) && resp >= 2) partAScore++;
        else if (itemsGroup2A.includes(i) && resp >= 3) partAScore++;
    }

    if (partAScore >= 4) {
      return {
        label: 'Altamente Sugestivo', color: CLINICAL_SEVERITY_COLORS.severe,
        interpretation: `O paciente marcou ${partAScore} de 6 itens na Parte A na área crítica. Padrão de sintomas altamente consistente com TDAH no adulto.`,
        recommendation: 'Investigação aprofundada mandatória. Considerar avaliação neuropsicológica e comorbidades.'
      };
    } else {
      return {
        label: 'Abaixo do Limiar', color: CLINICAL_SEVERITY_COLORS.minimal,
        interpretation: `O paciente marcou ${partAScore} de 6 na Parte A. Sintomas insuficientes para o limiar de triagem de TDAH.`,
        recommendation: 'Verificar se dificuldades de atenção se devem a estresse, ansiedade ou outras causas.'
      };
    }
  }
};

// ============================================================================
// MDQ (Transtorno Bipolar)
// ============================================================================
export const MDQ: ScaleDefinition = {
  id: 'MDQ',
  name: 'MDQ (Bipolaridade)',
  description: 'Questionário de Transtornos de Humor (Mood Disorder Questionnaire)',
  instruction: 'Por favor, responda cada pergunta da melhor forma possível.',
  questions: [
    { index: 0, text: '1. Houve algum período em que você não era o seu "eu" normal e... se sentiu tão bem ou hiperativo(a) que outras pessoas acharam que você não era o seu normal?', domain: 'Mania / Hipomania' },
    { index: 1, text: '2. ...você estava tão irritável que gritou ou começou a brigar com as pessoas?', domain: 'Mania / Hipomania' },
    { index: 2, text: '3. ...você se sentiu muito mais autoconfiante do que o normal?', domain: 'Mania / Hipomania' },
    { index: 3, text: '4. ...você dormiu muito menos do que o normal e sentiu que não precisava de sono?', domain: 'Mania / Hipomania' },
    { index: 4, text: '5. ...você falou muito mais e mais rápido do que o normal?', domain: 'Mania / Hipomania' },
    { index: 5, text: '6. ...pensamentos correram rapidamente pela sua cabeça, sem que pudesse pará-los?', domain: 'Mania / Hipomania' },
    { index: 6, text: '7. ...você se distraía tão facilmente com as coisas ao seu redor que tinha dificuldade de focar?', domain: 'Mania / Hipomania' },
    { index: 7, text: '8. ...você teve muito mais energia e fez muito mais atividades do que o normal?', domain: 'Mania / Hipomania' },
    { index: 8, text: '9. ...você foi muito mais ativo(a) ou fez coisas muito arriscadas?', domain: 'Mania / Hipomania' },
    { index: 9, text: '10. ...você ficava mais "dado" com as pessoas e mais expansivo, por exemplo, conversando com estranhos no meio da noite?', domain: 'Mania / Hipomania' },
    { index: 10, text: '11. ...você teve muito mais interesse por sexo do que o normal?', domain: 'Mania / Hipomania' },
    { index: 11, text: '12. ...você fez coisas fora do comum e que as pessoas poderiam achar excessivas, tolas ou imprudentes?', domain: 'Mania / Hipomania' },
    { index: 12, text: '13. ...gastar dinheiro causava problemas para você ou para a sua família?', domain: 'Mania / Hipomania' },
    // Pergunta 2 do MDQ (no nosso index = 13)
    { 
      index: 13, 
      text: 'Se você respondeu SIM a MAIS DE UMA das perguntas acima, várias dessas situações ocorreram durante o mesmo período de tempo?', 
      domain: 'Co-ocorrência',
      showIf: (responses) => {
        const yesses = responses.slice(0, 13).filter(r => r === 1).length;
        return yesses >= 2;
      }
    },
    // Pergunta 3 do MDQ (no nosso index = 14)
    { 
      index: 14, 
      text: 'Esses sintomas causaram algum problema (como ser incapaz de trabalhar, problemas na família ou problemas com a lei)?', 
      domain: 'Prejuízo Funcional',
      answerOptions: [
        { value: 0, label: 'Nenhum' },
        { value: 1, label: 'Pequeno' },
        { value: 2, label: 'Moderado' },
        { value: 3, label: 'Grave' }
      ]
    }
  ],
  answerOptions: SHARED_YES_NO, // Padrão
  severityRanges: [
    { min: 0, max: 6, label: 'Rastreio Negativo', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Sintomas relatados não atingem o limiar quantitativo do MDQ.', recommendation: 'Monitorar flutuações de humor.' },
    { min: 7, max: 15, label: 'Rastreio Positivo', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Score elevado na contagem de sintomas do MDQ.', recommendation: 'Investigar co-ocorrência em sessão e encaminhamento.' }
  ],
  
  customScoreCalculation: (responses) => {
    // Score do MDQ geralmente é a contagem de "Sim" na primeira parte (0 a 13)
    return responses.slice(0, 13).filter(r => r === 1).length;
  },

  customSeverityInterpretation: (responses, score) => {
    // Critério diagnóstico positivo do MDQ:
    // 1. 7 ou mais SIM na primeira parte
    // 2. SIM na co-ocorrência
    // 3. Prejuízo Moderado ou Grave
    const coOccurrence = responses[13] === 1;
    const impairment = responses[14] !== null && responses[14]! >= 2;
    
    const isPositive = score >= 7 && coOccurrence && impairment;

    if (isPositive) {
      return {
        label: 'Rastreio Positivo', color: CLINICAL_SEVERITY_COLORS.severe,
        interpretation: `O paciente atende aos critérios do MDQ para investigar o Espectro Bipolar (7+ sintomas ocorrendo juntos causando problema moderado/grave).`,
        recommendation: 'Atenção. Considerar encaminhamento psiquiátrico antes de iniciar protocolo TCC clássico ou prescrição de antidepressivos.'
      };
    } else {
      return {
        label: 'Rastreio Negativo', color: CLINICAL_SEVERITY_COLORS.minimal,
        interpretation: `Não atende a todos os 3 critérios de rastreio para Espectro Bipolar.`,
        recommendation: 'Apesar de negativo no rastreio, manter avaliação clínica se observar fortes alterações de humor.'
      };
    }
  }
};

// ============================================================================
// C-SSRS (Columbia-Suicide Severity Rating Scale)
// ============================================================================
export const CSSRS: ScaleDefinition = {
  id: 'C-SSRS',
  name: 'C-SSRS (Risco Suicida)',
  description: 'Versão de Triagem Recente (Último mês)',
  instruction: 'Por favor, responda se você teve esses pensamentos ou comportamentos NO ÚLTIMO MÊS.',
  questions: [
    { index: 0, text: '1. Acaso você desejou estar morto(a) ou desejou poder dormir e não acordar mais?', domain: 'Desejo de Morte' },
    { index: 1, text: '2. Acaso você realmente teve algum pensamento de se matar?', domain: 'Ideação Ativa' },
    
    // As perguntas 3, 4, 5 SÓ devem ser feitas se a 2 for SIM.
    { 
      index: 2, 
      text: '3. Acaso você esteve pensando em como você poderia fazer isso?', 
      domain: 'Método (Sem Plano)',
      showIf: (responses) => responses[1] === 1 
    },
    { 
      index: 3, 
      text: '4. Acaso você teve esses pensamentos e teve alguma intenção de colocá-los em prática?', 
      domain: 'Intenção Suicida',
      showIf: (responses) => responses[1] === 1 
    },
    { 
      index: 4, 
      text: '5. Acaso você começou a elaborar ou elaborou os detalhes de como se matar e você tem a intenção de realizar este plano?', 
      domain: 'Plano com Intenção',
      showIf: (responses) => responses[1] === 1 
    },
    
    // Pergunta 6 fazemos sempre, referente a comportamento prévio ao longo da VIDA e recentes (3 meses)
    // Para manter simples no digital, vamos formular como nos ultimos 3 meses ou longo da vida
    { 
      index: 5, 
      text: '6. Alguma vez na vida você fez algo ou começou a fazer algo ou se preparou para fazer algo a fim de acabar com a sua vida?', 
      domain: 'Comportamento' 
    },
  ],
  answerOptions: SHARED_YES_NO,
  severityRanges: [
    { min: 0, max: 0, label: 'Sem Risco Atual', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Paciente não relata ideação ou comportamentos recentes.', recommendation: 'Rotina normal.' },
    { min: 1, max: 1, label: 'Risco Baixo', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Desejo de morte ou ideação inespecífica passiva.', recommendation: 'Explorar ideação passiva em sessão.' },
    { min: 2, max: 3, label: 'Risco Moderado', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Ideação ativa recente reportada, sem intenção focada.', recommendation: 'Construir Plano de Segurança urgente.' },
    { min: 4, max: 5, label: 'Alto Risco', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Ideação com intenção/plano ou comportamento preparatório histórico.', recommendation: 'Ação clínica imediata exigida (quebra de sigilo/psiquiatria).' }
  ],
  
  customScoreCalculation: (responses) => {
    // Columbia não tem um "score" somatório. Nós retornamos o "nível de risco de 1 a 6".
    // 0=Nenhum, 1=Ideação, 2=Método, 3=Intenção, 4=Plano, 5=Comportamento Prévio
    if (responses[5] === 1) return 5; // Comportamento
    if (responses[4] === 1) return 4; // Plano
    if (responses[3] === 1) return 3; // Intenção
    if (responses[2] === 1) return 2; // Método
    if (responses[1] === 1) return 1; // Ideação Ativa
    if (responses[0] === 1) return 1; // Desejo
    return 0;
  },

  customSeverityInterpretation: (responses, score) => {
    // Q4 ou Q5 ou Q6 SIM = Risco Alto
    if (responses[3] === 1 || responses[4] === 1 || responses[5] === 1) {
      return {
        label: 'Alto Risco', color: CLINICAL_SEVERITY_COLORS.severe,
        interpretation: 'Ideação com intenção/plano ou comportamento preparatório histórico. Risco de segurança iminente.',
        recommendation: 'Ação clínica imediata exigida. Plano de segurança, envolver rede de apoio e considerar quebra de sigilo ou encaminhamento emergencial.'
      };
    }
    // Q2 SIM = Risco Moderado
    else if (responses[1] === 1 || responses[2] === 1) {
      return {
        label: 'Risco Moderado', color: CLINICAL_SEVERITY_COLORS.moderate,
        interpretation: 'Ideação ativa recente reportada, sem intenção de agir.',
        recommendation: 'Construir Plano de Segurança com urgência, aumentar frequência das sessões, contatar psiquiatra.'
      };
    }
    // Q1 SIM = Baixo
    else if (responses[0] === 1) {
       return {
        label: 'Baixo Risco', color: CLINICAL_SEVERITY_COLORS.mild,
        interpretation: 'Desejo de morte passivo, sem ideação ativa de autolesão.',
        recommendation: 'Explorar o desejo passivo em sessão, abordar falta de perspectiva e avaliar fatores protetivos.'
      };
    }
    
    return {
      label: 'Risco Negativo', color: CLINICAL_SEVERITY_COLORS.minimal,
      interpretation: 'Nenhuma ideação suicida recente ou comportamento prévio rastreados via formulário longo.',
      recommendation: 'Rotina normal.'
    };
  }
};

// ============================================================================
// CBI (Copenhagen Burnout Inventory)
// ============================================================================
const CBI_OPTIONS = [
  { value: 100, label: 'Sempre / Em grau muito alto' },
  { value: 75, label: 'Frequentemente / Em alto grau' },
  { value: 50, label: 'Às vezes / Em algum grau' },
  { value: 25, label: 'Raramente / Em grau baixo' },
  { value: 0, label: 'Nunca / Quase nunca / Grau muito baixo' },
];

export const CBI: ScaleDefinition = {
  id: 'CBI',
  name: 'CBI (Burnout)',
  description: 'Copenhagen Burnout Inventory',
  instruction: 'As perguntas abaixo avaliam seu nível de esgotamento. Responda considerando a frequência ou o grau em que você experimentou cada situação recentemente.',
  questions: [
    // Pessoal
    { index: 0, text: 'Com que frequência você se sente cansado(a)?', domain: 'Burnout Pessoal' },
    { index: 1, text: 'Com que frequência você se sente fisicamente esgotado(a)?', domain: 'Burnout Pessoal' },
    { index: 2, text: 'Com que frequência você se sente emocionalmente esgotado(a)?', domain: 'Burnout Pessoal' },
    { index: 3, text: 'Com que frequência você pensa: "Não aguento mais"?', domain: 'Burnout Pessoal' },
    { index: 4, text: 'Com que frequência você se sente fraco(a) ou suscetível a doenças?', domain: 'Burnout Pessoal' },
    { index: 5, text: 'Com que frequência você se sente exausto(a)?', domain: 'Burnout Pessoal' },
    // Trabalho
    { index: 6, text: 'O seu trabalho é emocionalmente exaustivo?', domain: 'Burnout Relacionado ao Trabalho' },
    { index: 7, text: 'Você se sente esgotado(a) no final do dia de trabalho?', domain: 'Burnout Relacionado ao Trabalho' },
    { index: 8, text: 'Você se sente exausto(a) de manhã cedo só de pensar em mais um dia de trabalho?', domain: 'Burnout Relacionado ao Trabalho' },
    { index: 9, text: 'Você acha que cada hora de trabalho é cansativa?', domain: 'Burnout Relacionado ao Trabalho' },
    { index: 10, text: 'Você tem energia para família e amigos durante suas horas de folga?', domain: 'Burnout Relacionado ao Trabalho', answerOptions: [
      { value: 0, label: 'Sempre' }, { value: 25, label: 'Frequentemente' }, { value: 50, label: 'Às vezes' }, { value: 75, label: 'Raramente' }, { value: 100, label: 'Nunca' }
    ]}, // Item invertido (inverso na pontuação)
    { index: 11, text: 'O seu trabalho é frustrante?', domain: 'Burnout Relacionado ao Trabalho' },
    { index: 12, text: 'Você sente que o seu trabalho consome você, que você "dá mais do que tem"?', domain: 'Burnout Relacionado ao Trabalho' },
    // Cliente
    { index: 13, text: 'Você acha difícil lidar com os clientes/pacientes?', domain: 'Burnout Relacionado ao Cliente' },
    { index: 14, text: 'O trabalho com clientes/pacientes drena a sua energia?', domain: 'Burnout Relacionado ao Cliente' },
    { index: 15, text: 'Você acha frustrante trabalhar com clientes/pacientes?', domain: 'Burnout Relacionado ao Cliente' },
    { index: 16, text: 'Você sente que dá mais do que recebe quando trabalha com clientes/pacientes?', domain: 'Burnout Relacionado ao Cliente' },
    { index: 17, text: 'Você está cansado(a) de trabalhar com clientes/pacientes?', domain: 'Burnout Relacionado ao Cliente' },
    { index: 18, text: 'Muitas vezes você questiona se vale a pena trabalhar com clientes/pacientes?', domain: 'Burnout Relacionado ao Cliente' },
  ],
  answerOptions: CBI_OPTIONS,
  severityRanges: [
    { min: 0, max: 49, label: 'Baixo/Moderado', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Níveis controlados de esgotamento. Não atinge critério claro para Síndrome de Burnout.', recommendation: 'Monitoramento preventivo. Explorar fatores de proteção.' },
    { min: 50, max: 100, label: 'Burnout Alto/Severo', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Média de esgotamento superior a 50 na escala percentual, indicativo clínico forte de Burnout.', recommendation: 'Avaliar afastamento laboral, reorganização de rotina e intervenção psiquiátrica.' }
  ],
  customScoreCalculation: (responses) => {
    const validResponses = responses.filter(r => r !== null) as number[];
    if (validResponses.length === 0) return 0;
    const sum = validResponses.reduce((a, b) => a + b, 0);
    return Math.round(sum / validResponses.length); // Média de 0 a 100
  }
};

// ============================================================================
// AQ-10 (Autismo Adulto Breve)
// ============================================================================
const AQ10_OPTIONS = [
  { value: 0, label: 'Discordo Totalmente' },
  { value: 1, label: 'Discordo Parcialmente' },
  { value: 2, label: 'Concordo Parcialmente' },
  { value: 3, label: 'Concordo Totalmente' }
];

export const AQ10: ScaleDefinition = {
  id: 'AQ-10',
  name: 'AQ-10 (Autismo Adulto)',
  description: 'Autism-Spectrum Quotient 10 (Triagem)',
  instruction: 'Por favor, indique o quanto você concorda ou discorda de cada uma das afirmações a seguir.',
  questions: [
    { index: 0, text: '1. Costumo reparar em pequenos sons quando os outros não reparam.', domain: 'Sensibilidade Sensorial' },
    { index: 1, text: '2. Em geral, concentro-me mais na imagem geral do que nos pequenos detalhes de uma situação.', domain: 'Atenção aos Detalhes' }, // Invertida
    { index: 2, text: '3. Tenho facilidade em fazer mais de uma coisa ao mesmo tempo.', domain: 'Atenção Compartilhada' }, // Invertida
    { index: 3, text: '4. Se for interrompido(a), consigo voltar àquilo que estava fazendo de forma muito rápida.', domain: 'Flexibilidade Mental' }, // Invertida
    { index: 4, text: '5. Sinto facilidade em ler "nas entrelinhas" aquilo que as pessoas me dizem.', domain: 'Comunicação' }, // Invertida
    { index: 5, text: '6. Consigo perceber quando alguém que me escuta está a ficar aborrecido ou entediado comigo.', domain: 'Empatia' }, // Invertida
    { index: 6, text: '7. Quando estou a ler uma história, sinto DIFICULDADE em perceber as intenções dos personagens.', domain: 'Empatia/Cegueira Mental' },
    { index: 7, text: '8. Gosto de colecionar informações sobre categorias de coisas (Ex: tipos de carro, tipos de pássaro, etc).', domain: 'Interesses Restritos' },
    { index: 8, text: '9. Sinto facilidade em perceber o que alguém está pensando ou sentindo apenas olhando para o seu rosto.', domain: 'Cegueira Mental' }, // Invertida
    { index: 9, text: '10. Sinto dificuldade em entender as intenções reais das pessoas.', domain: 'Teoria da Mente' },
  ],
  answerOptions: AQ10_OPTIONS,
  severityRanges: [
    { min: 0, max: 5, label: 'Rastreio Negativo', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'O paciente possui menos de 6 traços autistas listados na ferramenta rápida.', recommendation: 'Risco muito baixo para TEA no momento.' },
    { min: 6, max: 10, label: 'Rastreio Positivo (TEA)', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Paciente pontuou mais que 6 pontos (cutoff do AQ-10).', recommendation: 'Sugere avaliação especializada e baterias completas para TEA (ADOS, ADI-R or anamnese profunda).' }
  ],
  customScoreCalculation: (responses) => {
    let score = 0;
    // O AQ-10 pontua "1 ponto" se a resposta indica traço autista.
    // Questões normais (0, 6, 7, 9): Concordo (2 ou 3) = 1 ponto
    const directItems = [0, 6, 7, 9];
    // Questões invertidas (1, 2, 3, 4, 5, 8): Discordo (0 ou 1) = 1 ponto
    const invertedItems = [1, 2, 3, 4, 5, 8];

    responses.forEach((resp, idx) => {
      if (resp === null) return;
      if (directItems.includes(idx) && resp >= 2) score++;
      else if (invertedItems.includes(idx) && resp <= 1) score++;
    });
    return score;
  }
};

// ============================================================================
// SNAP-IV (TDAH / TOD Infantil)
// ============================================================================
const SNAP_OPTIONS = [
  { value: 0, label: 'Nem um pouco' },
  { value: 1, label: 'Só um pouco' },
  { value: 2, label: 'Bastante' },
  { value: 3, label: 'Demais' },
];

export const SNAP_IV: ScaleDefinition = {
  id: 'SNAP-IV',
  name: 'SNAP-IV (TDAH e Oposição)',
  description: 'Versão Brasileira SNAP-IV (Pais/Professores)',
  instruction: 'Avalie o comportamento da criança ou adolescente baseando-se no que foi percebido nos últimos meses.',
  questions: [
    // TDAH - Desatenção (1 a 9)
    { index: 0, text: '1. Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas.', domain: 'Desatenção' },
    { index: 1, text: '2. Tem dificuldade de manter a atenção em tarefas ou atividades de lazer.', domain: 'Desatenção' },
    { index: 2, text: '3. Parece não estar ouvindo quando se fala diretamente com ele(a).', domain: 'Desatenção' },
    { index: 3, text: '4. Não segue instruções até o fim e não termina deveres escolares, tarefas ou obrigações.', domain: 'Desatenção' },
    { index: 4, text: '5. Tem dificuldade para organizar tarefas e atividades.', domain: 'Desatenção' },
    { index: 5, text: '6. Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado.', domain: 'Desatenção' },
    { index: 6, text: '7. Perde coisas necessárias para tarefas ou atividades (brinquedos, lápis, livros).', domain: 'Desatenção' },
    { index: 7, text: '8. Distrai-se com facilidade por estímulos externos.', domain: 'Desatenção' },
    { index: 8, text: '9. É esquecido(a) nas atividades do dia-a-dia.', domain: 'Desatenção' },
    // TDAH - Hiperatividade (10 a 18)
    { index: 9, text: '10. Mexe com as mãos ou pés, ou se contorce na cadeira.', domain: 'Hiperatividade' },
    { index: 10, text: '11. Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado.', domain: 'Hiperatividade' },
    { index: 11, text: '12. Corre de um lado para outro ou sobe demais nas coisas em situações em que isso é inadequado.', domain: 'Hiperatividade' },
    { index: 12, text: '13. Tem dificuldade em brincar ou envolver-se em atividades de lazer de forma calma.', domain: 'Hiperatividade' },
    { index: 13, text: '14. Não para ou frequentemente está a "mil por hora".', domain: 'Hiperatividade' },
    { index: 14, text: '15. Fala em excesso.', domain: 'Impulsividade' },
    { index: 15, text: '16. Responde as perguntas de forma precipitada antes delas terem sido terminadas.', domain: 'Impulsividade' },
    { index: 16, text: '17. Tem dificuldade de esperar sua vez.', domain: 'Impulsividade' },
    { index: 17, text: '18. Interrompe ou se intromete nos assuntos dos outros (conversas ou brincadeiras).', domain: 'Impulsividade' },
    // TOD - Transtorno Opositivo Desafiador (19 a 26)
    { index: 18, text: '19. Descontrola-se, perde o pavo/temperamento.', domain: 'Oposição / Desafio' },
    { index: 19, text: '20. Discute com adultos.', domain: 'Oposição / Desafio' },
    { index: 20, text: '21. Desafia ou recusa-se ativamente a obedecer a solicitações ou regras de adultos.', domain: 'Oposição / Desafio' },
    { index: 21, text: '22. Faz coisas propositalmente que aborrecem as outras pessoas.', domain: 'Oposição / Desafio' },
    { index: 22, text: '23. Culpa os outros por seus próprios erros ou mau comportamento.', domain: 'Oposição / Desafio' },
    { index: 23, text: '24. É suscetível, ou facilmente aborrecido(a) pelos outros.', domain: 'Oposição / Desafio' },
    { index: 24, text: '25. É raivoso(a) ou ressentido(a).', domain: 'Oposição / Desafio' },
    { index: 25, text: '26. É rancoroso(a) ou vingativo(a).', domain: 'Oposição / Desafio' },
  ],
  answerOptions: SNAP_OPTIONS,
  // Mantemos o severityRanges como fallback genérico de pontuação (se faltar algum dado para a função customizada)
  severityRanges: [
    { min: 0, max: 25, label: 'Rastreio Negativo', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Abaixo da média esperada de gravidade para preenchimento de critérios.', recommendation: 'Observação comum.' },
    { min: 26, max: 50, label: 'Alerta Leve', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Sintomas elevados, embora não atinjam clareza máxima de diagnóstico.', recommendation: 'Orientação de pais e monitoramento.' },
    { min: 51, max: 78, label: 'Altamente Sugestivo', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Volume muito severo de respostas indicando múltiplos domínios afetados no dia-a-dia.', recommendation: 'Avaliação neuropediátrica e suporte multidisciplinar urgente.' }
  ],
  customSeverityInterpretation: (responses, score) => {
    // Validação Brasileira Mattos et al.: >= 6 itens marcados como Bastante(2) ou Demais(3) por categoria
    let inattentionCount = 0;
    let hyperactivityCount = 0;
    let oddCount = 0;
    
    responses.forEach((resp, idx) => {
      if (resp === null || resp < 2) return;
      if (idx <= 8) inattentionCount++;
      else if (idx <= 17) hyperactivityCount++;
      else oddCount++;
    });

    if (inattentionCount >= 6 || hyperactivityCount >= 6 || oddCount >= 6) {
      return {
        label: 'Altamente Sugestivo', color: CLINICAL_SEVERITY_COLORS.severe,
        interpretation: `Critério clínico clássico atingido: 6 ou mais sintomas marcados como "Bastante/Demais" em pelo menos um domínio. (Desatenção: ${inattentionCount}/9, Hiperatividade: ${hyperactivityCount}/9, Oposição: ${oddCount}/8).`,
        recommendation: 'Avaliação neuropediátrica urgente recomendada. Perfil altíssimo para TDAH ou TOD.'
      };
    } else if (inattentionCount >= 4 || hyperactivityCount >= 4 || oddCount >= 4) {
      return {
        label: 'Alerta Leve', color: CLINICAL_SEVERITY_COLORS.mild,
        interpretation: `Sintomas proeminentes, porém não atingem o limiar de 6 sintomas do DSM. (Desatenção: ${inattentionCount}/9, Hiperatividade: ${hyperactivityCount}/9, Oposição: ${oddCount}/8).`,
        recommendation: 'Monitorar desempenho na escola, orientar familiares e intervir psicopedagogicamente.'
      };
    } else {
      return {
        label: 'Rastreio Negativo', color: CLINICAL_SEVERITY_COLORS.minimal,
        interpretation: `Abaixo do ponto de corte clínico estruturado para TDAH ou TOD (apresentou menos de 6 sintomas graves por área).`,
        recommendation: 'Sintomas não atingem severidade clínica esperada no momento.'
      };
    }
  }
};

// ============================================================================
// OCI-R (Transtorno Obsessivo-Compulsivo)
// ============================================================================
const OCIR_OPTIONS = [
  { value: 0, label: 'Nem um pouco' },
  { value: 1, label: 'Um pouco' },
  { value: 2, label: 'Moderadamente' },
  { value: 3, label: 'Muito' },
  { value: 4, label: 'Extremamente' },
];

export const OCIR: ScaleDefinition = {
  id: 'OCI-R',
  name: 'OCI-R (Sintomas de TOC)',
  description: 'Obsessive-Compulsive Inventory - Revised',
  instruction: 'As afirmações a seguir referem-se a experiências que muitas pessoas têm nas suas vidas de todos os dias. Avalie o quanto cada experiência incomodou você durante o ÚLTIMO MÊS.',
  questions: [
    { index: 0, text: '1. Guardei tantas coisas que acabaram se amontoando pela casa.', domain: 'Acumulação' },
    { index: 1, text: '2. Verifiquei coisas com mais frequência do que o necessário (ex: registros de luz e água, portas, etc).', domain: 'Verificação' },
    { index: 2, text: '3. Fiquei chateado(a) quando as coisas não foram arrumadas do jeito "certo".', domain: 'Organização' },
    { index: 3, text: '4. Senti que tinha de contar as coisas mentalmente enquanto estava fazendo atividades rotineiras.', domain: 'Neutralização' },
    { index: 4, text: '5. Achei difícil tocar em um objeto se eu soubesse que ele tinha sido tocado por pessoas estranhas ou por certas pessoas.', domain: 'Lavagem' },
    { index: 5, text: '6. Tive dificuldade em controlar meus próprios pensamentos.', domain: 'Pensamento Obsessivo' },
    { index: 6, text: '7. Fui acumulando coisas que eu não precisava.', domain: 'Acumulação' },
    { index: 7, text: '8. Repeti várias vezes a verificação das portas e fechaduras.', domain: 'Verificação' },
    { index: 8, text: '9. Fiquei incomodado(a) se outras pessoas mudaram o jeito que as coisas estavam organizadas.', domain: 'Organização' },
    { index: 9, text: '10. Senti a necessidade de repetir certos números para mim mesmo(a).', domain: 'Neutralização' },
    { index: 10, text: '11. Às vezes, senti que tinha que me lavar ou limpar mais do que o necessário.', domain: 'Lavagem' },
    { index: 11, text: '12. Fiquei perturbado(a) por pensamentos maus ou desagradáveis que vinham à minha cabeça contra a minha vontade.', domain: 'Pensamento Obsessivo' },
    { index: 12, text: '13. Evitei jogar coisas fora.', domain: 'Acumulação' },
    { index: 13, text: '14. Conferi repetidamente se as janelas e portas estavam trancadas.', domain: 'Verificação' },
    { index: 14, text: '15. Precisei que as coisas estivessem arranjadas segundo um padrão determinado (ordem, simetria).', domain: 'Organização' },
    { index: 15, text: '16. Senti a necessidade de repetir minhas ações um certo número de vezes.', domain: 'Neutralização' },
    { index: 16, text: '17. Eu me preocupei por medo de contaminação.', domain: 'Lavagem' },
    { index: 17, text: '18. Tive muita preocupação com eventos desastrosos que poderiam acontecer na minha ausência.', domain: 'Pensamento Obsessivo' },
  ],
  answerOptions: OCIR_OPTIONS,
  severityRanges: [
    { min: 0, max: 20, label: 'Baixo (Não Clínico)', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Abaixo do ponto de corte esperado para TOC (21 pontos).', recommendation: 'Atenção a rituais brandos se gerarem sofrimento.' },
    { min: 21, max: 72, label: 'Alerta Clínico para TOC', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Pontuação sugere presença aguda de sofrimento por TOC.', recommendation: 'Avaliação clínica focada nos domínios mais pontuados na ferramenta. Protocolo ERP indicado.' }
  ]
};

// ============================================================================
// PCL-5 (Estresse Pós-Traumático DSM-5)
// ============================================================================
export const PCL5: ScaleDefinition = {
  id: 'PCL-5',
  name: 'PCL-5 (Estresse Pós-Traumático)',
  description: 'PTSD Checklist for DSM-5',
  instruction: 'Em relação ao evento estressante ocorrido, as questões abaixo perguntam o quanto você foi incomodado(a) por esses problemas no ÚLTIMO MÊS.',
  questions: [
    { index: 0, text: '1. Teve lembranças, pensamentos ou imagens repetidas, perturbadoras e indesejadas da experiência estressante?', domain: 'Intrusão (Critério B)' },
    { index: 1, text: '2. Teve sonhos ou pesadelos repetidos e perturbadores sobre a experiência estressante?', domain: 'Intrusão (Critério B)' },
    { index: 2, text: '3. Repentinamente sentiu ou agiu como se a experiência estressante estivesse acontecendo de novo (como se estivesse a revivê-la)?', domain: 'Intrusão (Critério B)' },
    { index: 3, text: '4. Sentiu-se muito perturbado(a) emocionalmente quando algo lhe lembrou da experiência estressante?', domain: 'Intrusão (Critério B)' },
    { index: 4, text: '5. Teve fortes reações físicas quando algo lhe lembrou da experiência estressante (ex: coração batendo rápido, falta de ar, suor)?', domain: 'Intrusão (Critério B)' },
    { index: 5, text: '6. Evitou memórias, pensamentos ou sentimentos associados à experiência estressante?', domain: 'Evitação (Critério C)' },
    { index: 6, text: '7. Evitou lembretes externos (pessoas, lugares, conversas, atividades, objetos ou situações) que lhe faziam lembrar a experiência estressante?', domain: 'Evitação (Critério C)' },
    { index: 7, text: '8. Teve dificuldade para se lembrar de partes importantes da experiência estressante?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 8, text: '9. Teve convicções e expectativas muito negativas sobre si mesmo(a), outras pessoas ou o mundo (ex: "sou mau", "não se pode confiar em ninguém")?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 9, text: '10. Culpou a si mesmo(a) ou outras pessoas pela experiência estressante ou pelo que aconteceu depois dela?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 10, text: '11. Teve fortes sentimentos negativos persistentes (ex: medo, pavor, raiva, culpa ou vergonha)?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 11, text: '12. Perdeu o interesse em atividades de que costumava gostar?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 12, text: '13. Sentiu-se distante ou isolado(a) das outras pessoas?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 13, text: '14. Teve dificuldade em sentir emoções positivas (ex: não conseguir sentir felicidade, ou não conseguir ter sentimentos carinhosos pelas pessoas)?', domain: 'Alterações Cognitivas/Humor (Critério D)' },
    { index: 14, text: '15. Apresentou comportamento irritadiço, explosões de raiva ou agiu de forma agressiva?', domain: 'Hiperatividade (Critério E)' },
    { index: 15, text: '16. Envolveu-se em comportamentos arriscados, perigosos ou autodestrutivos?', domain: 'Hiperatividade (Critério E)' },
    { index: 16, text: '17. Sentiu-se "superalerta", supervigilante ou com a guarda alta?', domain: 'Hiperatividade (Critério E)' },
    { index: 17, text: '18. Sentiu-se assustado(a) facilmente (tendo sobressaltos exagerados)?', domain: 'Hiperatividade (Critério E)' },
    { index: 18, text: '19. Teve dificuldade para se concentrar?', domain: 'Hiperatividade (Critério E)' },
    { index: 19, text: '20. Teve dificuldade para adormecer ou para continuar dormindo?', domain: 'Hiperatividade (Critério E)' },
  ],
  answerOptions: [
    { value: 0, label: 'Nada' },
    { value: 1, label: 'Um pouco' },
    { value: 2, label: 'Moderadamente' },
    { value: 3, label: 'Muito' },
    { value: 4, label: 'Extremamente' },
  ],
  severityRanges: [
    { min: 0, max: 32, label: 'Abaixo do Limiar', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Abaixo do ponto de corte aceito (33).', recommendation: 'Monitorar respostas normativas ao estresse.' },
    { min: 33, max: 80, label: 'Presunção de TEPT', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Escore de dor emocional compatível com TEPT do recém-DSM-5.', recommendation: 'Rastremento detalhado da trauma via anamnese.' }
  ]
};

// ============================================================================
// Pfeffer (Questionário de Atividades Funcionais - FAQ)
// ============================================================================
const PFEFFER_OPTIONS = [
  { value: 0, label: 'Normal / Nunca fez, mas seria capaz' },
  { value: 1, label: 'Faz, com um pouco de dificuldade' },
  { value: 2, label: 'Precisa de ajuda para fazer' },
  { value: 3, label: 'Incapaz de fazer ou depende totalmente' },
];

export const PFEFFER: ScaleDefinition = {
  id: 'Pfeffer',
  name: 'Pfeffer (Autonomia & Demência)',
  description: 'Functional Activities Questionnaire (FAQ) para Acompanhantes',
  instruction: 'Este questionário deve preferencialmente ser respondido por um familiar/cuidador. Avalie as habilidades funcionais atuais do paciente nas seguintes áreas:',
  questions: [
    { index: 0, text: '1. Lidar com o próprio dinheiro?', domain: 'Gestão Financeira' },
    { index: 1, text: '2. Fazer compras sozinho(a) para comprar roupas, mantimentos ou outras necessidades?', domain: 'Autonomia Cotidiana' },
    { index: 2, text: '3. Esquentar a água, fazer um café ou desligar o fogão?', domain: 'Atividade Doméstica' },
    { index: 3, text: '4. Preparar uma refeição sozinh(o)?', domain: 'Atividade Doméstica' },
    { index: 4, text: '5. Manter-se a par dos acontecimentos recentes ocorridos na comunidade e vizinhança?', domain: 'Inserção Social/Memória' },
    { index: 5, text: '6. Prestar atenção e discutir algo que leu em livro, jornal, revista ou que viu num programa de TV?', domain: 'Atenção Focada' },
    { index: 6, text: '7. Lembrar de compromissos tomados, de fatos recentes que vivenciou?', domain: 'Memória' },
    { index: 7, text: '8. Tomar corretamente seus próprios remédios?', domain: 'Gestão de Saúde' },
    { index: 8, text: '9. Andar pela vizinhança e voltar para casa?', domain: 'Orientação Espacial' },
    { index: 9, text: '10. Cumprimentar pessoas adequadamente e expressar sentimentos e desejos?', domain: 'Relacionamento Interpessoal' },
  ],
  answerOptions: PFEFFER_OPTIONS,
  severityRanges: [
    { min: 0, max: 5, label: 'Autonomia Preservada', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Paciente possui total ou substancial preservação do funcionamento independente cotidiano.', recommendation: 'Rastreio normal.' },
    { min: 6, max: 30, label: 'Declínio Funcional Sugestivo', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Pacientes com score acima de 5 encontram fortes dificuldades em AIVD (Demência/Declínio Cognitivo).', recommendation: 'Aprofundamento neuropsicológico mandatário, suporte aos familiares urgente e avaliação neuro/psiquiátrica focada.' }
  ]
};

// ============================================================================
// EXPORTS & FUNÇÕES MOTORAS
// ============================================================================
// ============================================================================
// PSS-10 (Escala de Estresse Percebido)
// ============================================================================
const PSS10_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Quase nunca' },
  { value: 2, label: 'Às vezes' },
  { value: 3, label: 'Frequentemente' },
  { value: 4, label: 'Muito frequentemente' },
];

export const PSS10: ScaleDefinition = {
  id: 'PSS-10',
  name: 'PSS-10 (Estresse Percebido)',
  description: 'Perceived Stress Scale',
  instruction: 'As questões a seguir perguntam sobre seus sentimentos e pensamentos durante o ÚLTIMO MÊS. Em cada caso, indique com que frequência você se sentiu ou pensou de determinada maneira.',
  questions: [
    { index: 0, text: '1. Com que frequência você ficou aborrecido(a) por causa de algo que aconteceu inesperadamente?', domain: 'Estresse' },
    { index: 1, text: '2. Com que frequência você se sentiu incapaz de controlar as coisas importantes da sua vida?', domain: 'Estresse' },
    { index: 2, text: '3. Com que frequência você se sentiu nervoso(a) e em estresse?', domain: 'Estresse' },
    { index: 3, text: '4. Com que frequência você sentiu confiança na sua capacidade para enfrentar os seus problemas pessoais?', domain: 'Coping (Positivo)' },
    { index: 4, text: '5. Com que frequência você sentiu que as coisas estavam a acontecer à sua maneira?', domain: 'Coping (Positivo)' },
    { index: 5, text: '6. Com que frequência você sentiu que não aguentava com as coisas todas que tinha para fazer?', domain: 'Estresse' },
    { index: 6, text: '7. Com que frequência você foi capaz de controlar irritações na sua vida?', domain: 'Coping (Positivo)' },
    { index: 7, text: '8. Com que frequência você sentiu que todos os aspectos de sua vida estavam sob controle?', domain: 'Coping (Positivo)' },
    { index: 8, text: '9. Com que frequência você se sentiu furioso(a) por causa de coisas que estiveram fora de seu controle?', domain: 'Estresse' },
    { index: 9, text: '10. Com que frequência você sentiu que os problemas se acumularam tanto que você não conseguiria resolvê-los?', domain: 'Estresse' },
  ],
  answerOptions: PSS10_OPTIONS,
  severityRanges: [
    { min: 0, max: 13, label: 'Baixo Estresse', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Nível baixo de estresse percebido. Boa capacidade de enfrentamento.', recommendation: 'Manter estratégias atuais de regulação emocional.' },
    { min: 14, max: 26, label: 'Estresse Moderado', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Nível moderado de estresse. Sobrecarga e imprevisibilidade presentes na rotina.', recommendation: 'Avaliar fatores estressores e introduzir técnicas de relaxamento e resolução de problemas.' },
    { min: 27, max: 40, label: 'Estresse Elevado', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Nível elevado de estresse percebido. Sentimento agudo de falta de controle e exaustão.', recommendation: 'Atenção clínica prioritária. Foco imediato em redução de danos, delegação e regulação do sistema nervoso.' }
  ],
  customScoreCalculation: (responses) => {
    const invert = [3, 4, 6, 7]; // Índices base 0 das questões inversas
    return responses.reduce((acc, val, idx) => {
       if (val === null) return acc;
       if (invert.includes(idx)) {
           return (acc as number) + (4 - val);
       }
       return (acc as number) + val;
    }, 0) as number;
  }
};

// ============================================================================
// DASS-21 (Depressão, Ansiedade e Estresse)
// ============================================================================
const DASS21_OPTIONS = [
  { value: 0, label: 'Não se aplicou' },
  { value: 1, label: 'Aplicou-se em algum grau' },
  { value: 2, label: 'Aplicou-se consideravelmente' },
  { value: 3, label: 'Aplicou-se muito' },
];

export const DASS21: ScaleDefinition = {
  id: 'DASS-21',
  name: 'DASS-21 (Humor/Ansiedade/Estresse)',
  description: 'Escala de Depressão, Ansiedade e Estresse (21 itens)',
  instruction: 'Por favor, indique o quanto cada afirmação se aplicou a você DURANTE A ÚLTIMA SEMANA.',
  questions: [
    { index: 0, text: '1. Achei difícil me acalmar.', domain: 'Estresse' },
    { index: 1, text: '2. Senti minha boca seca.', domain: 'Ansiedade' },
    { index: 2, text: '3. Não consegui vivenciar nenhum sentimento positivo.', domain: 'Depressão' },
    { index: 3, text: '4. Tive dificuldade em respirar em alguns momentos (ex. respiração ofegante, falta de ar, sem esforço físico).', domain: 'Ansiedade' },
    { index: 4, text: '5. Achei difícil ter iniciativa para fazer as coisas.', domain: 'Depressão' },
    { index: 5, text: '6. Tive a tendência de reagir de forma exagerada às situações.', domain: 'Estresse' },
    { index: 6, text: '7. Senti tremores (ex. nas mãos).', domain: 'Ansiedade' },
    { index: 7, text: '8. Senti que estava sempre nervoso.', domain: 'Estresse' },
    { index: 8, text: '9. Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridículo(a).', domain: 'Ansiedade' },
    { index: 9, text: '10. Senti que não tinha nada a desejar.', domain: 'Depressão' },
    { index: 10, text: '11. Senti-me agitado.', domain: 'Estresse' },
    { index: 11, text: '12. Achei difícil relaxar.', domain: 'Estresse' },
    { index: 12, text: '13. Senti-me depressivo(a) e sem ânimo.', domain: 'Depressão' },
    { index: 13, text: '14. Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo.', domain: 'Estresse' },
    { index: 14, text: '15. Senti que ia entrar em pânico.', domain: 'Ansiedade' },
    { index: 15, text: '16. Não consegui me entusiasmar com nada.', domain: 'Depressão' },
    { index: 16, text: '17. Senti que não tinha valor como pessoa.', domain: 'Depressão' },
    { index: 17, text: '18. Senti que estava um pouco emotivo/sensível demais.', domain: 'Estresse' },
    { index: 18, text: '19. Sabia que meu coração estava alterado mesmo não tendo feito esforço físico.', domain: 'Ansiedade' },
    { index: 19, text: '20. Senti medo sem motivo.', domain: 'Ansiedade' },
    { index: 20, text: '21. Senti que a vida não tinha sentido.', domain: 'Depressão' },
  ],
  answerOptions: DASS21_OPTIONS,
  customScoreCalculation: (responses) => {
    return responses.reduce((acc, val) => (acc as number) + (val || 0), 0) as number;
  },
  customSeverityInterpretation: (responses, score) => {
    let dep = 0, anx = 0, str = 0;
    responses.forEach((v, i) => {
      if (v === null) return;
      if ([2, 4, 9, 12, 15, 16, 20].includes(i)) dep += v;
      if ([1, 3, 6, 8, 14, 18, 19].includes(i)) anx += v;
      if ([0, 5, 7, 10, 11, 13, 17].includes(i)) str += v;
    });
    // Multiplicar por 2 para equivalência à DASS-42
    dep *= 2; anx *= 2; str *= 2;
    
    let severityLabel = 'Normal';
    let color: string = CLINICAL_SEVERITY_COLORS.minimal;
    if (dep >= 21 || anx >= 15 || str >= 26) { severityLabel = 'Grave/Extremo'; color = CLINICAL_SEVERITY_COLORS.severe; }
    else if (dep >= 14 || anx >= 10 || str >= 19) { severityLabel = 'Moderado'; color = CLINICAL_SEVERITY_COLORS.moderate; }
    else if (dep >= 10 || anx >= 8 || str >= 15) { severityLabel = 'Leve'; color = CLINICAL_SEVERITY_COLORS.mild; }

    return {
      label: severityLabel,
      color,
      interpretation: `(Escala Original x2) Depressão: ${dep} | Ansiedade: ${anx} | Estresse: ${str}`,
      recommendation: 'A DASS-21 avalia 3 eixos clínicos distintos. Concentre a formulação de caso no eixo de maior pontuação.'
    };
  }
};

// ============================================================================
// SPIN (Inventário de Fobia Social)
// ============================================================================
const SPIN_OPTIONS = [
  { value: 0, label: 'Nada' },
  { value: 1, label: 'Um pouco' },
  { value: 2, label: 'Razoavelmente' },
  { value: 3, label: 'Muito' },
  { value: 4, label: 'Extremamente' },
];

export const SPIN: ScaleDefinition = {
  id: 'SPIN',
  name: 'SPIN (Fobia Social)',
  description: 'Social Phobia Inventory',
  instruction: 'Por favor, indique o quanto as situações abaixo incomodaram você durante a ÚLTIMA SEMANA.',
  questions: [
    { index: 0, text: '1. Tenho medo de pessoas que têm autoridade.', domain: 'Medo' },
    { index: 1, text: '2. Sinto-me incomodado ao corar na frente das pessoas.', domain: 'Fisiológico' },
    { index: 2, text: '3. Festas e eventos sociais me apavoram.', domain: 'Medo' },
    { index: 3, text: '4. Evito falar com pessoas que não conheço.', domain: 'Evitação' },
    { index: 4, text: '5. Ter que ser criticado me apavora.', domain: 'Medo' },
    { index: 5, text: '6. Evito fazer coisas ou falar com as pessoas por medo de passar vergonha.', domain: 'Evitação' },
    { index: 6, text: '7. Suar na frente das pessoas me causa aflição.', domain: 'Fisiológico' },
    { index: 7, text: '8. Evito ir a festas.', domain: 'Evitação' },
    { index: 8, text: '9. Evito lugares onde há pessoas que não conheço.', domain: 'Evitação' },
    { index: 9, text: '10. Sinto medo de falar com estranhos.', domain: 'Medo' },
    { index: 10, text: '11. Evito fazer discursos ou apresentações.', domain: 'Evitação' },
    { index: 11, text: '12. Eu faria qualquer coisa para não ser criticado.', domain: 'Evitação' },
    { index: 12, text: '13. Palpitações no coração me incomodam quando estou perto de pessoas.', domain: 'Fisiológico' },
    { index: 13, text: '14. Tenho medo de fazer coisas quando as pessoas estão olhando.', domain: 'Medo' },
    { index: 14, text: '15. Evito usar banheiros públicos.', domain: 'Evitação' },
    { index: 15, text: '16. Sinto medo que descubram que sou incompetente ou estúpido.', domain: 'Medo' },
    { index: 16, text: '17. Tremer na frente dos outros me apavora.', domain: 'Fisiológico' },
  ],
  answerOptions: SPIN_OPTIONS,
  severityRanges: [
    { min: 0, max: 20, label: 'Ausente / Leve', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Nível ausente ou leve de fobia social.', recommendation: 'Sem indicação clínica primária para fobia social.' },
    { min: 21, max: 30, label: 'Moderada', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Sintomas moderados de fobia social.', recommendation: 'Explorar esquemas de evitação e crenças nucleares em terapia.' },
    { min: 31, max: 40, label: 'Grave', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Sintomas graves de fobia social.', recommendation: 'Foco ativo em dessensibilização e reestruturação cognitiva.' },
    { min: 41, max: 68, label: 'Muito Grave', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Sintomas muito graves e altamente limitantes.', recommendation: 'Prioridade clínica. Avaliar suporte psiquiátrico combinado.' }
  ]
};

// ============================================================================
// ISI (Índice de Gravidade de Insônia)
// ============================================================================
const ISI_OPTIONS = [
  { value: 0, label: 'Nenhum / Nada' },
  { value: 1, label: 'Leve / Um pouco' },
  { value: 2, label: 'Moderado' },
  { value: 3, label: 'Grave / Muito' },
  { value: 4, label: 'Muito Grave / Extremo' },
];

export const ISI: ScaleDefinition = {
  id: 'ISI',
  name: 'ISI (Insônia)',
  description: 'Insomnia Severity Index',
  instruction: 'Avalie a gravidade do seu problema de sono nas ÚLTIMAS DUAS SEMANAS.',
  questions: [
    { index: 0, text: '1. Gravidade da dificuldade em adormecer:', domain: 'Início' },
    { index: 1, text: '2. Gravidade da dificuldade em manter o sono:', domain: 'Manutenção' },
    { index: 2, text: '3. Problema de acordar muito cedo:', domain: 'Despertar' },
    { index: 3, text: '4. Insatisfação com o padrão de sono atual (0=Muito Satisfeito, 4=Muito Insatisfeito):', domain: 'Satisfação' },
    { index: 4, text: '5. Até que ponto o problema de sono interfere no seu funcionamento diário (fadiga, humor, concentração)?', domain: 'Impacto' },
    { index: 5, text: '6. Até que ponto o seu problema de sono é perceptível para os outros?', domain: 'Impacto' },
    { index: 6, text: '7. O quanto você está preocupado/aflito com seu problema de sono?', domain: 'Preocupação' },
  ],
  answerOptions: ISI_OPTIONS,
  severityRanges: [
    { min: 0, max: 7, label: 'Ausência de Insônia', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Ausência de insônia clinicamente significativa.', recommendation: 'Manter rotina de higiene do sono.' },
    { min: 8, max: 14, label: 'Insônia Subclínica', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Insônia leve ou subclínica.', recommendation: 'Atenção a estressores recentes e higiene do sono.' },
    { min: 15, max: 21, label: 'Insônia Clínica Moderada', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Insônia clínica de gravidade moderada.', recommendation: 'Indicação para intervenções focadas no sono (ex: TCC-I).' },
    { min: 22, max: 28, label: 'Insônia Clínica Grave', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Insônia clínica grave com alto impacto diurno.', recommendation: 'Avaliação psiquiátrica sugerida. TCC-I prioritária.' }
  ]
};

// ============================================================================
// MSI-BPD (Triagem de Borderline)
// ============================================================================
const MSI_BPD_OPTIONS = [
  { value: 0, label: 'Falso' },
  { value: 1, label: 'Verdadeiro' },
];

export const MSI_BPD: ScaleDefinition = {
  id: 'MSI-BPD',
  name: 'MSI-BPD (Triagem Borderline)',
  description: 'McLean Screening Instrument for BPD',
  instruction: 'Por favor, responda Verdadeiro ou Falso para as seguintes afirmações sobre o seu comportamento ao longo da vida.',
  questions: [
    { index: 0, text: '1. Algum parente próximo ou amigo já lhe disse que você tem dificuldades com o seu temperamento ou problemas com sua raiva?', domain: 'Raiva' },
    { index: 1, text: '2. Você já teve algum relacionamento muito próximo que teve muitos altos e baixos, com discussões ou separações frequentes?', domain: 'Relações' },
    { index: 2, text: '3. Você tem com frequência a sensação de que não sabe quem você é, ou que não tem ideia do que quer da vida?', domain: 'Identidade' },
    { index: 3, text: '4. Você tem uma tendência a suspeitar das coisas que as pessoas fazem ou do porquê elas as fazem?', domain: 'Paranoia' },
    { index: 4, text: '5. Você já se cortou deliberadamente, se queimou, deu socos em si mesmo, se machucou de alguma outra forma ou tentou suicídio?', domain: 'Autodano' },
    { index: 5, text: '6. Você tem variações de humor frequentes (sentindo-se bem num momento e em outro se sentindo muito bravo/a, ou deprimido/a e depois bem de novo)?', domain: 'Instabilidade Afetiva' },
    { index: 6, text: '7. Você tem se sentido vazio/a com frequência?', domain: 'Vazio' },
    { index: 7, text: '8. Você tem se sentido frequentemente como se você não fosse real, ou que as coisas ao seu redor não fossem reais?', domain: 'Dissociação' },
    { index: 8, text: '9. Você costuma ter explosões de raiva ou de sarcasmo frequentes?', domain: 'Raiva' },
    { index: 9, text: '10. Você tem gastado dinheiro, bebido, usado drogas, ou se envolvido com sexo impulsivamente?', domain: 'Impulsividade' },
  ],
  answerOptions: MSI_BPD_OPTIONS,
  severityRanges: [
    { min: 0, max: 6, label: 'Abaixo do Ponto de Corte', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Abaixo do indicativo para TPB.', recommendation: 'Risco baixo para Transtorno de Personalidade Borderline.' },
    { min: 7, max: 10, label: 'Possível TPB', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Alta probabilidade de Transtorno de Personalidade Borderline.', recommendation: 'Avaliação profunda recomendada (Aplicação do BPQ sugerida).' }
  ]
};

// ============================================================================
// ASSIST (Registro Numérico Manual)
// ============================================================================
export const ASSIST: ScaleDefinition = {
  id: 'ASSIST',
  name: 'ASSIST (Triagem OMS)',
  description: 'Registro Numérico de Risco de Substâncias',
  instruction: 'Insira o Escore Global ou de Substância Primária (Ferramenta apenas para registro de psicometria de consultório, não enviar link).',
  questions: [
    { index: 0, text: '1. Escore ASSIST (Substância Primária / Maior Risco)', domain: 'Geral' }
  ],
  answerOptions: [
    { value: 0, label: 'Preencher número' }
  ],
  severityRanges: [
    { min: 0, max: 3, label: 'Baixo Risco', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Uso de baixo risco.', recommendation: 'Aconselhamento breve e manutenção.' },
    { min: 4, max: 26, label: 'Risco Moderado', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Uso abusivo/nocivo indicando risco moderado.', recommendation: 'Intervenção breve recomendada.' },
    { min: 27, max: 100, label: 'Alto Risco', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Provável dependência.', recommendation: 'Encaminhamento para tratamento intensivo especializado.' }
  ]
};

// ============================================================================
// BPQ (Borderline Personality Questionnaire - 80 itens)
// ============================================================================
const BPQ_OPTIONS = [
  { value: 0, label: 'Falso' },
  { value: 1, label: 'Verdadeiro' },
];

const BPQ_RAW = [
  "Por vezes, faço coisas sem pensar muito nelas.",
  "Por vezes, fico subitamente deprimido(a) ou ansioso(a).",
  "Por vezes, sinto-me abandonado pelas pessoas.",
  "Fico raramente desapontado(a) com os meus amigos.",
  "Sinto-me inferior aos outros.",
  "No passado, já ameacei ferir-me a mim próprio.",
  "Não acredito ser capaz de fazer alguma coisa de interessante com a minha vida.",
  "Raramente me zango com outras pessoas.",
  "Por vezes, sinto-me como se não fosse real.",
  "Não tenho relações sexuais com uma pessoa, a menos que a conheça há algum tempo.",
  "Por vezes, depois de me sentir ansioso(a) ou irritado(a) fico triste.",
  "Quando as pessoas que me são próximas morrem ou me deixam, sinto-me abandonado(a).",
  "Exagero frequentemente o valor das amizades e acabo por descobrir depois que, afinal, elas não têm esse valor.",
  "Se eu fosse mais parecido(a) com outras pessoas, sentir-me-ia melhor comigo próprio(a).",
  "Já tentei ferir-me voluntariamente, embora não me quisesse matar.",
  "No geral, a minha vida é bastante aborrecida.",
  "Entro com alguma frequência em “cenas de pancadaria”.",
  "Por vezes, as pessoas estão longe de me compreender.",
  "Os meus amigos dizem-me que o meu humor se altera muito rapidamente.",
  "Ficar sozinho assusta-me.",
  "As pessoas que parecem honestas muitas vezes acabam por me desiludir.",
  "Já tentei suicidar-me.",
  "Por vezes, sinto-me como se não tivesse nada para oferecer aos outros.",
  "Tenho problemas em controlar o meu temperamento.",
  "Consigo perceber aquilo que vai na cabeça dos outros.",
  "Já experimentei drogas “duras” (por exemplo, cocaína, heroína).",
  "O meu humor alterna frequentemente ao longo do dia entre estados de felicidade, cólera, ansiedade e depressão.",
  "Quando os meus amigos se vão embora, fico confiante de que os voltarei a ver.",
  "Sinto-me frequentemente desapontado pelos meus amigos.",
  "Já me cortei propositadamente.",
  "Muitas vezes, sinto-me sozinho(a) e abandonado(a).",
  "Não tenho grandes dificuldades em controlar o meu temperamento.",
  "Por vezes, vejo ou ouço coisas que as outras pessoas não conseguem ver ou ouvir.",
  "Na minha opinião, é natural ter relações sexuais num primeiro encontro.",
  "Por vezes, sinto-me muito triste, mas este sentimento pode mudar rapidamente.",
  "As pessoas deixam-me frequentemente ficar mal, ou “empurram-me” para baixo.",
  "Gostava de ser mais parecido(a) com alguns dos meus amigos.",
  "Costumava tentar ferir-me para obter alguma atenção.",
  "Sou, com grande frequência, diferente com diferentes pessoas em diferentes situações de tal forma que, às vezes, já não sei verdadeiramente quem sou.",
  "Irrito-me facilmente com os outros.",
  "Por vezes, consigo ouvir aquilo que as outras pessoas estão a pensar.",
  "Fico “pedrado” (com drogas) sempre que me apetece.",
  "Raramente me sinto triste ou ansioso(a).",
  "Ninguém gosta de mim.",
  "Quando confio nas pessoas, elas raramente me desiludem.",
  "Sinto que as pessoas não gostariam de mim se me conhecessem verdadeiramente.",
  "Irrito-me facilmente.",
  "É impossível “ler” a mente dos outros.",
  "Por vezes, sinto-me muito feliz, mas este sentimento pode mudar rapidamente.",
  "Acho difícil depender dos outros porque eles nunca estão presentes quando preciso.",
  "As amizades com as pessoas que me interessam têm muitos altos e baixos.",
  "Sinto-me à-vontade com a minha maneira de ser.",
  "Nunca tentei ferir-me.",
  "Raramente me sinto sozinho(a).",
  "Por vezes, acho que as mais pequenas coisas me irritam.",
  "Por vezes, não consigo distinguir entre o real e o imaginário.",
  "Quando bebo, bebo muito.",
  "Considero-me uma pessoa mal-humorada.",
  "Tenho dificuldades em desenvolver relações de amizades próximas, porque as pessoas frequentemente me abandonam.",
  "Os meus amigos estão sempre presentes quando preciso deles.",
  "Gostaria de ser outra pessoa.",
  "Acho que a minha vida não é muito interessante.",
  "Quando estou irritado(a), por vezes, atiro e bato em objectos partindo-os.",
  "Nos últimos tempos apanhei várias multas por excesso de velocidade.",
  "Por vezes, sinto-me como se estivesse numa “montanha-russa” emocional.",
  "Sinto-me como se a minha família me tivesse abandonado.",
  "Sinto-me à-vontade com a pessoa que sinto ser.",
  "Por vezes, faço coisas impulsivamente.",
  "A minha vida não tem sentido.",
  "Não tenho a certeza sobre aquilo que quero fazer no futuro.",
  "Por vezes, como tanto que fico com dores de barriga ou tenho mesmo de vomitar.",
  "As pessoas já me disseram que sou uma pessoa temperamental.",
  "Por vezes, as pessoas de quem gosto abandonam-me.",
  "Muitas vezes, em situações sociais, sinto que as outras pessoas podem ver através de mim e perceber que não tenho muito para dar.",
  "Já fui hospitalizado por me ter ferido propositadamente.",
  "Muitas vezes, sinto uma espécie de vazio dentro de mim.",
  "Muitas vezes, os outros irritam-me.",
  "Muitas vezes, fico irrequieto apenas por pensar que alguém de quem eu gosto verdadeiramente me pode deixar.",
  "Por vezes, sinto-me confuso(a) com os meus objectivos a longo prazo.",
  "Os outros dizem que me irrito facilmente."
];

export const BPQ: ScaleDefinition = {
  id: 'BPQ',
  name: 'BPQ (Borderline 80 itens)',
  description: 'Borderline Personality Questionnaire',
  instruction: 'Faça um círculo em volta do V se pensar que a afirmação é verdadeira para você ou F se achar que é falsa.',
  questions: BPQ_RAW.map((text, i) => ({
    index: i,
    text: `${i + 1}. ${text}`,
    domain: 'BPQ'
  })),
  answerOptions: BPQ_OPTIONS,
  severityRanges: [
    { min: 0, max: 29, label: 'Subclínico', color: CLINICAL_SEVERITY_COLORS.minimal, interpretation: 'Abaixo do limiar clínico severo.', recommendation: 'Avaliação clínica geral.' },
    { min: 30, max: 44, label: 'Moderado', color: CLINICAL_SEVERITY_COLORS.mild, interpretation: 'Sintomas moderados de Transtorno de Personalidade Borderline.', recommendation: 'Acompanhamento psicoterápico recomendado.' },
    { min: 45, max: 59, label: 'Grave', color: CLINICAL_SEVERITY_COLORS.moderate, interpretation: 'Sintomas graves de Transtorno de Personalidade Borderline.', recommendation: 'Psicoterapia intensa (ex: DBT) e avaliação psiquiátrica.' },
    { min: 60, max: 80, label: 'Muito Grave', color: CLINICAL_SEVERITY_COLORS.severe, interpretation: 'Sintomas muito graves, forte desregulação.', recommendation: 'Risco de crise elevado. Intervenção psiquiátrica prioritária.' }
  ],
  customScoreCalculation: (responses) => {
    const invertedItems = [9, 42, 27, 3, 44, 59, 51, 66, 52, 53, 7, 31, 47]; 
    let total = 0;
    responses.forEach((val, i) => {
      if (val !== null) {
        if (invertedItems.includes(i)) {
          total += (val === 1 ? 0 : 1);
        } else {
          total += (val === 1 ? 1 : 0);
        }
      }
    });
    return total;
  },
  customSeverityInterpretation: (responses, _) => {
    // 0-based arrays based on the provided Scoring Key
    const impulsividadeItems = [0, 9, 25, 33, 41, 56, 63, 67, 70];
    const instabilidadeItems = [1, 10, 18, 26, 34, 42, 48, 57, 64, 71];
    const abandonoItems = [2, 11, 19, 27, 43, 49, 58, 65, 72, 77];
    const relacoesItems = [3, 12, 20, 28, 35, 44, 50, 59];
    const autoimagemItems = [4, 13, 36, 45, 51, 60, 66, 69, 73];
    const suicidioItems = [5, 14, 21, 29, 37, 52, 74];
    const vazioItems = [6, 15, 22, 30, 38, 53, 61, 68, 75, 78];
    const raivaItems = [7, 16, 23, 31, 39, 46, 54, 62, 76, 79];
    const psicoseItems = [8, 17, 24, 32, 40, 47, 55];

    // Inverted items (0-based)
    const invertedItems = [9, 42, 27, 3, 44, 59, 51, 66, 52, 53, 7, 31, 47]; 

    const getScore = (val: number | null, index: number) => {
      if (val === null) return 0;
      if (invertedItems.includes(index)) {
        return val === 1 ? 0 : 1; // Inverted
      }
      return val === 1 ? 1 : 0;
    };

    let scores = {
      imp: 0, inst: 0, aban: 0, rel: 0, auto: 0, sui: 0, vaz: 0, raiv: 0, psi: 0, total: 0
    };

    responses.forEach((val, i) => {
      if (val !== null) {
        const pts = getScore(val, i);
        scores.total += pts;
        if (impulsividadeItems.includes(i)) scores.imp += pts;
        if (instabilidadeItems.includes(i)) scores.inst += pts;
        if (abandonoItems.includes(i)) scores.aban += pts;
        if (relacoesItems.includes(i)) scores.rel += pts;
        if (autoimagemItems.includes(i)) scores.auto += pts;
        if (suicidioItems.includes(i)) scores.sui += pts;
        if (vazioItems.includes(i)) scores.vaz += pts;
        if (raivaItems.includes(i)) scores.raiv += pts;
        if (psicoseItems.includes(i)) scores.psi += pts;
      }
    });

    let severityLabel = 'Subclínico';
    let color: string = CLINICAL_SEVERITY_COLORS.minimal;
    if (scores.total >= 60) { severityLabel = 'Muito Grave'; color = CLINICAL_SEVERITY_COLORS.severe; }
    else if (scores.total >= 45) { severityLabel = 'Grave'; color = CLINICAL_SEVERITY_COLORS.moderate; }
    else if (scores.total >= 30) { severityLabel = 'Moderado'; color = CLINICAL_SEVERITY_COLORS.mild; }

    return {
      label: `${scores.total}/80 - ${severityLabel}`,
      color,
      interpretation: `Impul: ${scores.imp} | Inst: ${scores.inst} | Aband: ${scores.aban} | Relações: ${scores.rel} | Autoimag: ${scores.auto} | Autodan: ${scores.sui} | Vazio: ${scores.vaz} | Raiva: ${scores.raiv} | Psicose: ${scores.psi}`,
      recommendation: 'A pontuação detalhada mostra os principais eixos afetados. Avalie clinicamente o eixo predominante.'
    };
  }
};

export const SCALES_MAP: Record<ScaleName, ScaleDefinition> = {
  'PHQ-9': PHQ9,
  'GAD-7': GAD7,
  'ASRS-18': ASRS18,
  'MDQ': MDQ,
  'C-SSRS': CSSRS,
  'CBI': CBI,
  'AQ-10': AQ10,
  'SNAP-IV': SNAP_IV,
  'OCI-R': OCIR,
  'PCL-5': PCL5,
  'Pfeffer': PFEFFER,
  'PSS-10': PSS10,
  'DASS-21': DASS21,
  'SPIN': SPIN,
  'ISI': ISI,
  'MSI-BPD': MSI_BPD,
  'ASSIST': ASSIST,
  'BPQ': BPQ,
};

/** Lógica central para calcular o score (fallback soma simples) */
export function calculateScore(scaleName: ScaleName, responses: (number | null)[]): number {
  const scale = SCALES_MAP[scaleName];
  if (!scale) return 0;
  
  if (scale.customScoreCalculation) {
    return scale.customScoreCalculation(responses);
  }
  
  // Base: soma simples tratando null/omitidos como 0
  return responses.reduce((sum, val) => (sum as number) + (val || 0), 0) as number;
}

/** Lógica central para classificação de gravidade com o objeto interpretation */
export function getSeverityInterpretation(
  scaleName: ScaleName,
  score: number,
  responses?: (number | null)[]
): SeverityInterpretation | null {
  const scale = SCALES_MAP[scaleName];
  if (!scale) return null;

  // Lógica customizada prioritária (só se tiver as respostas do paciente)
  if (scale.customSeverityInterpretation && responses && responses.length > 0) {
    return scale.customSeverityInterpretation(responses, score);
  }

  // Lógica baseada em ranges para escalas tradicionais
  const range = scale.severityRanges?.find(r => score >= r.min && score <= r.max);
  if (range) {
    return {
      label: range.label,
      color: range.color,
      interpretation: range.interpretation,
      recommendation: range.recommendation
    };
  }

  return null;
}

/** Helper pra interface legada ou mais simples. */
export function getSeverity(
  scaleName: ScaleName,
  score: number,
  responses?: (number | null)[]
): { label: string; color: string } {
  const interp = getSeverityInterpretation(scaleName, score, responses);
  if (interp) return { label: interp.label, color: interp.color };
  return { label: 'Desconhecida', color: SEMANTIC_COLORS.neutral };
}
