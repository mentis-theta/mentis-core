
// services/knowledgeBaseService.ts

/**
 * Knowledge Base Service (RAG Simplificado)
 * 
 * NOTA TÉCNICA:
 * Para evitar sobrecarga do navegador e custos excessivos de tokens com a IA,
 * não incluímos os manuais completos (DSM-5/CID-11).
 * 
 * Aplicamos o princípio de "Curadoria de Alta Densidade":
 * Armazenamos apenas os Critérios Diagnósticos Essenciais e Protocolos Práticos.
 */

interface KnowledgeChunk {
  id: string;
  source: string;
  content: string;
  keywords: string[];
}

const knowledgeBase: KnowledgeChunk[] = [
  // ==================================================================================
  // TRANSTORNOS DE ANSIEDADE E ESTRESSE
  // ==================================================================================
  {
    id: 'dsm5-panic-attack',
    source: 'DSM-5-TR: Ataque de Pânico',
    content: `CRITÉRIOS DIAGNÓSTICOS: Surto abrupto de medo intenso que alcança pico em minutos. Requer 4+ sintomas: 1.Palpitações/taquicardia; 2.Sudorese; 3.Tremores; 4.Falta de ar; 5.Asfixia; 6.Dor torácica; 7.Náusea; 8.Tontura; 9.Calafrios/calor; 10.Parestesias; 11.Desrealização/Despersonalização; 12.Medo de perder controle; 13.Medo de morrer.`,
    keywords: ['pânico', 'ataque', 'coração', 'medo morrer', 'sufocamento'],
  },
  {
    id: 'dsm5-gad',
    source: 'DSM-5-TR: Transtorno de Ansiedade Generalizada (TAG)',
    content: `Ansiedade/preocupação excessiva na maioria dos dias por 6 meses. Sintomas (3+): Inquietação, fatigabilidade, dificuldade de concentração, irritabilidade, tensão muscular, perturbação do sono. Difere do CID-11 que foca mais em sintomas autonômicos persistentes.`,
    keywords: ['tag', 'ansiedade generalizada', 'preocupação', 'tensão muscular', 'insônia', 'cid-11'],
  },
  {
    id: 'dsm5-social-anxiety',
    source: 'DSM-5-TR: Transtorno de Ansiedade Social (Fobia Social)',
    content: `Medo acentuado de situações sociais com possível avaliação. Medo de ser humilhado/rejeitado. A situação é evitada ou suportada com intenso sofrimento. Desproporcional ao risco real. Duração > 6 meses.`,
    keywords: ['fobia social', 'timidez', 'julgamento', 'falar em público', 'vergonha'],
  },
  {
    id: 'dsm5-ptsd',
    source: 'DSM-5-TR: Transtorno de Estresse Pós-Traumático (TEPT)',
    content: `Exposição a morte real/ameaçada, lesão grave ou violência sexual. Grupos de Sintomas: 1. Intrusão (flashbacks, pesadelos); 2. Evitação persistente de estímulos; 3. Alterações negativas na cognição/humor (crenças negativas, anedonia); 4. Excitabilidade (hipervigilância, sobressalto). Duração > 1 mês.`,
    keywords: ['tept', 'trauma', 'flashback', 'abuso', 'violência', 'pesadelos', 'evitação'],
  },
  {
    id: 'dsm5-ocd',
    source: 'DSM-5-TR: Transtorno Obsessivo-Compulsivo (TOC)',
    content: `Presença de Obsessões (pensamentos intrusivos, indesejados, causam ansiedade) e/ou Compulsões (comportamentos repetitivos ou atos mentais para aliviar a ansiedade). As O/C consomem tempo (>1h/dia) ou causam sofrimento significativo.`,
    keywords: ['toc', 'obsessão', 'compulsão', 'limpeza', 'verificação', 'rituais', 'pensamentos intrusivos'],
  },

  // ==================================================================================
  // TRANSTORNOS DO HUMOR
  // ==================================================================================
  {
    id: 'dsm5-depression',
    source: 'DSM-5-TR: Transtorno Depressivo Maior',
    content: `Requer 5+ sintomas por 2 semanas (obrigatório humor deprimido ou anedonia): 1.Humor deprimido; 2.Anedonia; 3.Perda/ganho de peso; 4.Insônia/Hipersonia; 5.Agitação/Retardo psicomotor; 6.Fadiga; 7.Sentimento de inutilidade/culpa; 8.Dificuldade de concentração; 9.Pensamentos de morte.`,
    keywords: ['depressão', 'tristeza', 'suicídio', 'desânimo', 'culpa', 'sono', 'anedonia'],
  },
  {
    id: 'dsm5-bipolar',
    source: 'DSM-5-TR: Transtorno Bipolar (Tipo I e II)',
    content: `Bipolar I: Requer Maniao (Humor elevado/expansivo/irritável por 1 semana, energia aumentada, grandiosidade, < sono, loquacidade, fuga de ideias).
    Bipolar II: Requer Hipomania (4 dias, sem prejuízo grave) + Episódio Depressivo Maior.`,
    keywords: ['bipolar', 'mania', 'hipomania', 'euforia', 'grandiosidade', 'compras', 'energia'],
  },

  // ==================================================================================
  // NEURODESENVOLVIMENTO
  // ==================================================================================
  {
    id: 'dsm5-adhd',
    source: 'DSM-5-TR: TDAH (Déficit de Atenção/Hiperatividade)',
    content: `Padrão persistente de desatenção e/ou hiperatividade-impulsividade.
    Desatenção (6+): Erros por descuido, não escuta, não finaliza tarefas, desorganizado, perde coisas, distraído.
    Hiperatividade (6+): Remexe mãos, levanta-se, corre excessivamente, "a todo vapor", fala demais, interrompe.
    Sintomas antes dos 12 anos em 2+ ambientes.`,
    keywords: ['tdah', 'atenção', 'hiperatividade', 'foco', 'distração', 'escola', 'desorganização'],
  },
  {
    id: 'dsm5-autism',
    source: 'DSM-5-TR: TEA (Transtorno do Espectro Autista)',
    content: `A. Déficits persistentes na comunicação e interação social (reciprocidade, não verbal, relacionamentos).
    B. Padrões restritos e repetitivos de comportamento (estereotipias, inflexibilidade a rotinas, interesses fixos, hiper/hiporreatividade sensorial).`,
    keywords: ['tea', 'autismo', 'social', 'rotina', 'sensorial', 'estereotipia'],
  },

  // ==================================================================================
  // PERSONALIDADE
  // ==================================================================================
  {
    id: 'dsm5-borderline',
    source: 'DSM-5-TR: Transtorno de Personalidade Borderline',
    content: `Instabilidade nas relações, autoimagem e afetos, e impulsividade (5+): 1.Esforços para evitar abandono; 2.Relacionamentos instáveis (amor/ódio); 3.Identidade instável; 4.Impulsividade (gastos, sexo); 5.Comportamento suicida/automutilação; 6.Instabilidade afetiva; 7.Vazio crônico; 8.Raiva intensa.`,
    keywords: ['borderline', 'tpb', 'instabilidade', 'abandono', 'cortes', 'automutilação', 'vazio', 'raiva'],
  },

  // ==================================================================================
  // INTERVENÇÕES E TÉCNICAS (TCC & TERAPIAS CONTEXTUAIS)
  // ==================================================================================
  {
    id: 'tech-cbt-restructuring',
    source: 'Técnica: Reestruturação Cognitiva (R.P.D.)',
    content: `Protocolo: 1. Identificar Situação Gatilho. 2. Identificar Pensamento Automático (PA). 3. Identificar Emoção. 4. Evidências a favor do PA. 5. Evidências contra o PA. 6. Gerar Pensamento Alternativo realista.`,
    keywords: ['reestruturação', 'pensamento', 'rpd', 'distorção', 'cognitiva'],
  },
  {
    id: 'tech-act-defusion',
    source: 'ACT: Técnicas de Desfusão Cognitiva',
    content: `Objetivo: Olhar PARA o pensamento, não ATRAVÉS dele. Técnicas: 1. "Eu estou tendo o pensamento de que..."; 2. Repetir palavra até perder sentido; 3. Tratar mente como entidade separada; 4. Imaginar pensamentos como folhas no rio.`,
    keywords: ['act', 'desfusão', 'aceitação', 'pensamentos', 'distanciamento'],
  },
  {
    id: 'tech-dbt-tipp',
    source: 'DBT: Habilidade TIPP (Emergência)',
    content: `Para alta excitação emocional (Crise): T-Temperatura (Gelo no rosto); I-Intense Exercise; P-Paced Breathing; P-Paired Muscle Relaxation.`,
    keywords: ['dbt', 'tipp', 'crise', 'regulação emocional', 'borderline', 'emergência'],
  },
  {
    id: 'tech-behavioral-activation',
    source: 'TCC: Ativação Comportamental',
    content: `Contra depressão: Quebrar ciclo inatividade->tristeza. 1. Monitorar rotina. 2. Identificar valores. 3. Agendar atividades prazerosas ou de mestria, independente da vontade (ação oposta).`,
    keywords: ['ativação', 'depressão', 'ânimo', 'rotina', 'comportamental'],
  },
  {
    id: 'tech-exposure',
    source: 'TCC: Terapia de Exposição',
    content: `Para Ansiedade/Fobias/TOC. 1. Criar Hierarquia (0-100 SUDs). 2. Exposição gradual ao estímulo temido. 3. Prevenção de Resposta (não realizar rituais). 4. Aguardar habituação ou violação de expectativa.`,
    keywords: ['exposição', 'fobia', 'medo', 'toc', 'tept', 'ansiedade'],
  },
  {
    id: 'tech-social-skills',
    source: 'TCC: Treino de Habilidades Sociais (THS)',
    content: `Técnicas: 1. Assertividade (expressar necessidades sem agredir); 2. Ensaio comportamental (Role-play); 3. Feedback; 4. Modelagem. Útil para Fobia Social, Autismo e Depressão.`,
    keywords: ['habilidades sociais', 'assertividade', 'ths', 'timidez', 'comunicação'],
  }
];

/**
 * Searches the knowledge base for chunks relevant to the query.
 * Uses a weighted scoring system to improve relevance.
 */
export const searchKnowledgeBase = (query: string, maxResults: number = 3): KnowledgeChunk[] => {
    if (!query.trim()) return [];

    // Limpa e normaliza a query
    const queryWords = query.toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"")
        .split(/\s+/)
        .filter(w => w.length > 2); // Ignora palavras muito curtas

    const scores: { [id: string]: number } = {};

    knowledgeBase.forEach(chunk => {
        let score = 0;
        
        // Peso Alto: Match exato em Keywords (definidas manualmente)
        chunk.keywords.forEach(keyword => {
            if (query.toLowerCase().includes(keyword)) {
                score += 15;
            }
        });

        // Peso Médio: Match no Título/Fonte
        queryWords.forEach(word => {
            if (chunk.source.toLowerCase().includes(word)) {
                score += 8;
            }
        });

        // Peso Baixo: Match no Conteúdo
        queryWords.forEach(word => {
            if (chunk.content.toLowerCase().includes(word)) {
                score += 2;
            }
        });

        if (score > 0) {
            scores[chunk.id] = score;
        }
    });

    // Ordenar por score decrescente
    const sortedChunkIds = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    
    // Retornar os Top N resultados
    return sortedChunkIds
        .slice(0, maxResults)
        .map(id => knowledgeBase.find(chunk => chunk.id === id))
        .filter((chunk): chunk is KnowledgeChunk => chunk !== undefined);
};
