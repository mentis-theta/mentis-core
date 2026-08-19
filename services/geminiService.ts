import { anonymizeClinicalText } from '../utils/anonymizer.ts';
import { AI_MODELS } from '../config/ai_models';
import { supabase } from './supabaseClient.ts';
import type { SuggestedTag, Patient, ClinicalInsight, Goal, InterventionSuggestion, Anamnesis, Session } from '../types.ts';
import { searchClinicalKnowledge } from './ragService.ts';
import { PROMPTS } from './prompts.ts';
import { generateUUID } from '../utils/uuid.ts';
import { getPlainTextFromSession } from '../components/Session/RichTextRenderer';
import { extractSessionEvidence } from './extractor/evidenceSourceManager';
import { parseLLMJSON } from '../utils/aiUtils.ts';
import { hydratePatientData } from './patientHydrationService.ts';
import { logApiCall } from './aiLoggerService.ts';
import { showGlobalToast } from '../contexts/ToastContext.tsx';

// Helper de atraso (Backoff)
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const callAIProxy = async (
  action: string, 
  payload: any, 
  actionNameForLog: string = 'unknown_action',
  onProgress?: (progress: { attempt: number; status: string }) => void
) => {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = [2000, 4000, 8000];

  let currentPayload = { ...payload };

  // Automatically inject safety settings to prevent false positives in clinical contexts
  if (action === 'generate_content') {
    if (!currentPayload.config) currentPayload.config = {};
    if (!currentPayload.config.safetySettings) {
      currentPayload.config.safetySettings = [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
      ];
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = performance.now();
    let statusCode = 200;
    let errorReason = '';
    let responseData = null;

    try {
      if (onProgress && attempt > 1) {
        onProgress({ attempt, status: `Servidores sob alta demanda. Otimizando requisição (Tentativa ${attempt}/${MAX_RETRIES})...` });
      }

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { action, payload: currentPayload }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

      responseData = data;
      const latency = Math.round(performance.now() - startTime);

      await logApiCall({
        actionName: actionNameForLog,
        modelUsed: currentPayload.model || 'unknown',
        statusCode: 200,
        latencyMs: latency,
        requestPayload: currentPayload,
        responsePayload: data
      });

      return data;

    } catch (error: any) {
      const latency = Math.round(performance.now() - startTime);
      
      let errorDetails = error.message;
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errJson = await error.context.json();
          errorDetails = errJson.error || errJson.message || errorDetails;
        } catch (e) {}
      }

      if (typeof errorDetails === 'object' && errorDetails !== null) {
        errorDetails = errorDetails.message || JSON.stringify(errorDetails);
      }

      if (typeof errorDetails === 'string' && errorDetails.startsWith('{')) {
        try {
          const parsed = JSON.parse(errorDetails);
          if (parsed.error && parsed.error.message) {
            errorDetails = parsed.error.message;
          }
        } catch (e) {}
      }

      // Inferir status
      if (typeof errorDetails === 'string' && (errorDetails.includes('experiencing high demand') || errorDetails.includes('503'))) {
        statusCode = 503;
        errorReason = 'UNAVAILABLE / HIGH DEMAND';
      } else if (typeof errorDetails === 'string' && (errorDetails.includes('429') || errorDetails.includes('RESOURCE_EXHAUSTED'))) {
        statusCode = 429;
        errorReason = 'RESOURCE_EXHAUSTED (Rate Limit)';
      } else if (typeof errorDetails === 'string' && (errorDetails.toLowerCase().includes('timeout') || errorDetails.includes('504'))) {
        statusCode = 504;
        errorReason = 'GATEWAY_TIMEOUT';
      } else {
        statusCode = 500;
        errorReason = errorDetails;
      }

      await logApiCall({
        actionName: actionNameForLog,
        modelUsed: currentPayload.model || 'unknown',
        statusCode,
        errorReason,
        latencyMs: latency,
        requestPayload: currentPayload,
        responsePayload: { error: errorDetails }
      });

      if (statusCode === 429 || statusCode === 503 || statusCode === 500 || statusCode === 504) {
        if (attempt < MAX_RETRIES) {
          // Fallback para Flash se estiver usando Pro e continuar falhando
          if (attempt === MAX_RETRIES - 1 && currentPayload.model?.includes('pro')) {
            currentPayload = { ...currentPayload, model: AI_MODELS.FAST_TASKS };
          }
          await delay(BACKOFF_MS[attempt - 1]);
          continue;
        } else if (currentPayload.provider !== 'groq') {
          // Se esgotou todas as tentativas com Gemini, fallback de emergência para Groq
          console.warn("Gemini limit reached, falling back to Groq Qwen...");
          currentPayload = { ...currentPayload, provider: 'groq', model: 'qwen/qwen3.6-27b' };
          attempt = 0; // Reinicia contador para o Groq
          continue;
        } else {
          const msg = 'Nossos servidores cognitivos estão sobrecarregados no momento. Seu prontuário está salvo, tente gerar o insight novamente em instantes.';
          showGlobalToast(msg, 'error');
          throw new Error(msg);
        }
      }

      console.error(`Erro ao invocar a Edge Function ai-proxy (${action}):`, errorDetails, error);
      const errMsg = typeof errorDetails === 'string' ? errorDetails : "Erro ao processar requisição na Edge Function";
      showGlobalToast(errMsg, 'error');
      throw new Error(errMsg);
    }
  }
};

export const analyzeSessionNotes = async (notes: string): Promise<SuggestedTag[]> => {
  if (!notes.trim()) {
    return Promise.resolve([]);
  }

  const prompt = PROMPTS.ANALYZE_SESSION(notes);

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              tag: { type: "STRING" },
              relevance: { type: "NUMBER" }
            },
            required: ['tag', 'relevance']
          }
        },
        temperature: 0.3,
      }
    });

    const jsonResponse = parseLLMJSON<any[]>(response.text || "[]");

    const suggestedTags: SuggestedTag[] = jsonResponse.map((item: any) => ({
      id: generateUUID(),
      text: item.tag,
      relevance: item.relevance,
    }));

    return suggestedTags.sort((a, b) => b.relevance - a.relevance);

  } catch (error: unknown) {
    console.error("Error analyzing session notes with Gemini Edge Function:", error);
    return [];
  }
};

export const generateSessionPrintSummary = async (notes: string): Promise<string> => {
  if (!notes.trim()) {
    return "";
  }

  const prompt = PROMPTS.SUMMARIZE_SESSION_FOR_PRINT(notes);

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        // Plain text response 
        temperature: 0.3,
      }
    });

    return response.text || "";
  } catch (error: unknown) {
    console.error("Error generating session print summary with Gemini Edge Function:", error);
    return notes; // Fallback to original notes if error
  }
};

export const suggestInterventions = async (patient: Patient, goal: Pick<Goal, 'title' | 'description'>, masterKey: string): Promise<InterventionSuggestion> => {
  const { sessions } = await hydratePatientData(patient.id, masterKey, 'clinical_evolution');
  const recentSessionNotes = sessions.slice(-3).map(s => `[${s.status}] ${extractSessionEvidence(s).extractionText}`).join('\n');
  const searchQuery = `${goal.title} ${goal.description} ${recentSessionNotes}`;
  const knowledgeContext = await searchClinicalKnowledge(searchQuery, 2);

  const contextString = knowledgeContext.length > 0
    ? `Contexto Clínico de Referência (RAG):\n${knowledgeContext.map(c => `- Fonte: ${c.source}\n  Conteúdo: ${c.content}`).join('\n\n')}`
    : 'Nenhum contexto clínico específico encontrado na base de conhecimento.';

  const prompt = PROMPTS.SUGGEST_INTERVENTIONS(contextString, goal, recentSessionNotes);

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        temperature: 0.6,
      }
    });

    const jsonResponse = parseLLMJSON<string[]>(response.text || "[]");
    return {
      suggestions: jsonResponse || [],
      sources: knowledgeContext.map(({ source, content }) => ({ source, content })),
    };

  } catch (error: unknown) {
    console.error("Error suggesting interventions via Edge Function:", error);
    return { suggestions: [], sources: [] };
  }
};

export const generateClinicalInsights = async (patient: Patient, masterKey: string, mode: 'summary' | 'sabatina' = 'summary'): Promise<{ insight: ClinicalInsight; analyzedSessionIds: string[] } | null> => {
  const { sessions, goals: hydratedGoals } = await hydratePatientData(patient.id, masterKey, 'summary');
  const allNotes = sessions.map(s => extractSessionEvidence(s).extractionText).join('\n');
  const allGoals = hydratedGoals.map(g => `${g.title}: ${g.description}`).join('\n');
  const searchQuery = `${allNotes} ${allGoals}`;
  const knowledgeContext = await searchClinicalKnowledge(searchQuery, 3);

  const contextString = knowledgeContext.length > 0
    ? `Contexto Clínico de Referência (RAG):\n${knowledgeContext.map(c => `- Fonte: ${c.source}\n  Conteúdo: ${c.content}`).join('\n\n')}`
    : 'Nenhum contexto clínico encontrado.';

  const rawHistory = sessions.map(s => `
    [Data: ${new Date(s.date).toLocaleDateString()}]
    Status: ${s.status}
    Tags: ${s.tags.map(t => t.text).join(', ') || 'N/A'}
    Anotações: ${extractSessionEvidence(s).extractionText}
  `).join('\n---\n');
  const history = anonymizeClinicalText(rawHistory, patient);
  const liveSummary = anonymizeClinicalText(patient.liveSummary || "Nenhum resumo anterior disponível.", patient);

  const goals = hydratedGoals.map(g => `
    - Meta: "${g.title}" (Status: ${g.status})
      Intervenções: ${g.interventions.map(i => `${i.text} [${i.status}]`).join(', ') || 'Nenhuma'}
  `).join('\n');

  const prompt = mode === 'sabatina' 
    ? PROMPTS.GENERATE_SABATINA(contextString, goals, history, liveSummary) 
    : PROMPTS.GENERATE_INSIGHTS(contextString, goals, history, liveSummary);

  const responseSchema = mode === 'sabatina' ? {
    type: "OBJECT",
    properties: {
      raciocinio_clinico: { type: "STRING" },
      is_red_flag_alert: { type: "BOOLEAN" },
      red_flag_reason: { type: "STRING" },
      summary: { type: "STRING" },
      blindSpots: { type: "ARRAY", items: { type: "STRING" } },
      technicalCritique: { type: "ARRAY", items: { type: "STRING" } },
      practicalManagement: { type: "ARRAY", items: { type: "STRING" } },
      ethicalAlerts: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ['raciocinio_clinico', 'is_red_flag_alert', 'summary', 'blindSpots', 'technicalCritique', 'practicalManagement', 'ethicalAlerts']
  } : {
    type: "OBJECT",
    properties: {
      raciocinio_clinico: { type: "STRING" },
      is_red_flag_alert: { type: "BOOLEAN" },
      red_flag_reason: { type: "STRING" },
      summary: { type: "STRING" },
      goalProgress: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            goalTitle: { type: "STRING" },
            progressSummary: { type: "STRING" },
            linkedSessionsCount: { type: "INTEGER" }
          },
          required: ['goalTitle', 'progressSummary', 'linkedSessionsCount']
        }
      },
      emergingThemes: { type: "ARRAY", items: { type: "STRING" } },
      nextStepSuggestions: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ['raciocinio_clinico', 'is_red_flag_alert', 'summary', 'goalProgress', 'emergingThemes', 'nextStepSuggestions']
  };

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: mode === 'sabatina' ? 0.3 : 0.5,
      }
    });

    const partialInsight = parseLLMJSON<any>(response.text || "{}");

    return {
      insight: {
        ...partialInsight,
        sources: knowledgeContext.map(({ source, content }) => ({ source, content })),
      },
      analyzedSessionIds: sessions.map(s => s.id)
    };

  } catch (error: unknown) {
    console.error("Error generating insights via Edge Function:", error);
    return null;
  }
};

export const generateAnamnesisFromSessions = async (patient: Patient, masterKey: string): Promise<Anamnesis | null> => {
  const { sessions } = await hydratePatientData(patient.id, masterKey, 'clinical_evolution');
  if (!sessions || sessions.length === 0) return null;

  const sessionsText = sessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => `[Sessão ${new Date(s.date).toLocaleDateString()} - Status: ${s.status}]: ${extractSessionEvidence(s).extractionText}`)
    .join('\n\n---\n\n');

  const prompt = PROMPTS.GENERATE_ANAMNESIS(sessionsText);

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            mainComplaint: { type: "STRING" },
            historyOfPresentIllness: { type: "STRING" },
            personalHistory: { type: "STRING" },
            familyHistory: { type: "STRING" },
            medicalPsychiatricHistory: { type: "STRING" },
            lifestyle: { type: "STRING" },
            observation: { type: "STRING" },
            medications: { type: "STRING" },
            diagnosticHypothesis: { type: "STRING" },
          },
          required: ['mainComplaint', 'historyOfPresentIllness', 'personalHistory', 'familyHistory', 'medicalPsychiatricHistory', 'lifestyle', 'observation', 'medications', 'diagnosticHypothesis']
        },
        temperature: 0.4,
      }
    });

    const data = parseLLMJSON<any>(response.text || "{}");
    return {
      ...data,
      lastUpdated: new Date().toISOString()
    };

  } catch (error: unknown) {
    console.error("Error generating anamnesis via Edge Function:", error);
    return null;
  }
};

export const generateBioecologicalMap = async (sessions: Session[]) => {
  const sessionTexts = sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(s =>
      `Date: ${new Date(s.date).toLocaleDateString()}\nContent: ${extractSessionEvidence(s).extractionText}\nTags: ${s.tags?.join(', ') || ''}`
    ).join('\n---\n');

  const prompt = `
    Analyze the following therapy session notes based on Urie Bronfenbrenner's Bioecological Theory.
    Identify key entities and classify them into ecological systems with high clinical precision.

    1. Ecological Context & Radius (Center 0,0):
       - Microssistema (150-280px): Does the patient *physically participate* in this setting? (e.g., Home, School, Workplace).
       - Exossistema (320-480px): Does the setting impact the patient, but they *do not* participate? (e.g., Partner's work, School Board, Local Laws).
       - Macrossistema (520-680px): Cultural values, economic crises, ideologies.
    
    2. Relationship Quality & Reciprocity (Edges):
       - 'conflict': Tension, stress, abuse. (Red/Dashed).
       - 'support': Help, love, resources. (Green/Thick).
       - 'neutral': Information only. (Gray/Thin).
       
       Reciprocity Analysis:
       - 'mutual': Two-way exchange (Double Arrow).
       - 'input': Entity influences patient only (Arrow to Patient).
       - 'output': Patient influences entity only (Arrow to Entity).

    Return JSON:
    {
      "nodes": [ { "id": "string", "label": "string", "type": "sphere", "data": { "type": "stressor"| "resource"| "family"| "institution", "label": "string" }, "position": { "x": number, "y": number } } ],
      "edges": [ { "id": "e-source-target", "source": "central", "target": "id", "data": { "type": "conflict"|"support", "reciprocity": "mutual"|"input"|"output" } } ]
    }
    * Distribute nodes circularly to avoid overlap.

    Session History:
    ${sessionTexts}
    
    Return ONLY JSON.
  `;

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    const jsonResponse = parseLLMJSON<any>(response.text || "{}");
    return jsonResponse;

  } catch (error: unknown) {
    console.error("Error generating Bioecological Map via Edge Function:", error);
    return { nodes: [], edges: [] };
  }
};

// ---- Draft Review AI Tools ----

/**
 * Corrige ortografia, pontuação e gramática do rascunho clínico.
 * Mantém o conteúdo e significado inalterados.
 */
export const correctSpellingAndPunctuation = async (text: string): Promise<string> => {
  if (!text.trim()) return text;

  const prompt = `Você é um revisor de textos clínicos em português do Brasil.

TAREFA: Corrija APENAS erros de ortografia, pontuação e gramática do texto abaixo.

REGRAS ESTRITAS:
- NÃO altere o conteúdo, significado ou estrutura do texto.
- NÃO adicione informações novas.
- NÃO remova informações existentes.
- NÃO altere termos técnicos de psicologia/saúde mental.
- NÃO reformule frases — apenas corrija erros.
- Mantenha abreviações clínicas intactas (ex: "pcte", "hx", "dx").
- Retorne APENAS o texto corrigido, sem explicações.

TEXTO ORIGINAL:
${text}`;

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    return response.text?.trim() || text;
  } catch (error: unknown) {
    console.error("Error correcting spelling via Edge Function:", error);
    throw error;
  }
};

/**
 * Reorganiza o rascunho clínico conforme as orientações do CFP.
 * Base legal: Resolução CFP nº 001/2009 (Art. 2º) + Manual de Orientação (2025).
 * O CFP NÃO impõe formato rígido — o profissional tem autonomia técnica.
 * Esta função organiza o texto para melhor legibilidade, sem inventar conteúdo.
 */
export const formatToCFPModel = async (text: string, patientName?: string, transcript?: string): Promise<string> => {
  if (!text.trim() && !transcript?.trim()) return text;

  const prompt = `Você é um psicólogo clínico que organiza registros de evolução conforme as orientações do Conselho Federal de Psicologia (CFP).

BASE LEGAL: Resolução CFP nº 001/2009, Art. 2º — o registro documental deve contemplar:
a) Identificação do usuário/instituição atendida;
b) Avaliação de demanda e definição de objetivos do trabalho;
c) Registro da evolução do trabalho, de modo a permitir o acompanhamento do caso;
d) Registro de encaminhamento ou encerramento;
e) Cópias de outros documentos produzidos.

TAREFA: Reorganize o rascunho de sessão abaixo em um formato claro e profissional para prontuário clínico.

ESTRUTURA SUGERIDA (adapte conforme o conteúdo do rascunho):
- Demanda da Sessão: O que o paciente trouxe como tema ou queixa.
- Procedimentos Técnico-Científicos Adotados: O que o profissional fez durante a sessão (técnicas, intervenções, abordagens). Inclua SOMENTE se o rascunho mencionar intervenções.
- Evolução do Caso: Observações clínicas, estado do paciente, progressos ou retrocessos.
- Encaminhamentos / Próximos Passos: Se mencionados no rascunho.

REGRAS CRÍTICAS:
- Utilize APENAS informações presentes no rascunho original. NÃO invente, NÃO deduza, NÃO adicione informações clínicas que não foram escritas pelo profissional.
- Se uma seção não tiver informação no rascunho, OMITA a seção inteira (não escreva "não registrado").
- Use linguagem técnica e profissional em português do Brasil.
- NÃO inclua campos de identificação (data, nome do profissional, CRP) — esses são preenchidos automaticamente pelo sistema.
${patientName ? `- O nome do paciente é "${patientName}". Use o nome de forma natural no texto (ex: "Paciente relatou...", "${patientName} apresentou..."). EVITE usar termos artificiais como "o/a paciente".` : ''}
- PROIBIDO usar formatação Markdown (NÃO use asteriscos ** para negrito, NÃO use hashtags ## para títulos). Retorne APENAS texto puro.
- Retorne APENAS o texto formatado, sem comentários, explicações ou cabeçalhos extras.

RASCUNHO ORIGINAL DO PROFISSIONAL:
${text}

${transcript ? `TRANSCRIÇÃO BRUTA DA SESSÃO (Material de apoio):
${transcript}` : ''}`;

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    return response.text?.trim() || text;
  } catch (error: unknown) {
    console.error("Error formatting to CFP model via Edge Function:", error);
    throw error;
  }
};

export const generateGenogramFromSessions = async (sessions: Session[]): Promise<any> => {
  const sessionTexts = sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(s => `Data: ${new Date(s.date).toLocaleDateString()}\nStatus: ${s.status}\nConteúdo: ${extractSessionEvidence(s).extractionText}`)
    .join('\n\n---\n\n');

  const prompt = `
    Analise as anotações clínicas a seguir e extraia a estrutura familiar e genealógica (Genograma) do paciente.
    Seja clínico e direto na identificação dos parentes.
    
    O seu foco é descobrir:
    1. Quem compõe a família (nome, grau de parentesco, sexo biológico, idade, se está vivo ou falecido).
    2. Como essas pessoas se conectam sistemicamente.
    
    Para o layout, posicione espacialmente (eixo X e Y):
    - Avós: Y=50
    - Pais / Tios: Y=150
    - Paciente e Irmãos: Y=250
    - Filhos: Y=350
    Espace os nós lateralmente (eixo X) usando incrementos de 150 a 200px para evitar sobreposição.
    
    Para ligações de parentesco (edges/linhas):
    - O tipo visual deve ser sempre "step" ou "smoothstep".
    - Indique casamentos usando um customEdge tipo "marriage" (se houver essa percepção visual nas regras). Para agora, retorne o type "smoothstep".
    - Indique a qualidade do vínculo usando um texto resumido em "label".

    O Paciente principal sempre tem o ID 'central' ou 'paciente'.
    
    Retorne ESTRITAMENTE o formato JSON abaixo:
    {
      "nodes": [
        {
          "id": "string_uuid_ou_sequencial",
          "type": "male" | "female", 
          "position": { "x": numero, "y": numero },
          "data": { "label": "Nome/Grau (ex: Pai - Roberto)", "age": "45", "deceased": boolean }
        }
      ],
      "edges": [
        {
          "id": "e_origem_destino",
          "source": "id_origem",
          "target": "id_destino",
          "type": "smoothstep",
          "label": "Grau ou Tipo de Ligação"
        }
      ]
    }
    
    Anotações Clínicas:
    ${sessionTexts}
    
    Retorne SOMENTE o código JSON válido, sem marcação markdown.
  `;

  try {
    const response = await callAIProxy('generate_content', {
      model: AI_MODELS.FAST_TASKS,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Baixa variação, foco em assertividade familiar
      }
    });

    const jsonResponse = parseLLMJSON<any>(response.text || "{}");
    return jsonResponse;

  } catch (error: unknown) {
    console.error("Error generating Genogram via Edge Function:", error);
    return { nodes: [], edges: [] };
  }
};

export const generateVocationalAnalysis = async (
  score: any,
  onProgress?: (progress: { attempt: number; status: string }) => void
): Promise<string> => {
  const prompt = `
Você é um especialista em Avaliação Psicológica e Orientação Vocacional.
Analise o perfil de interesses profissionais do paciente baseado estritamente na Tipologia de Holland (RIASEC).

Dados do Paciente:
- Código Holland: ${score.hollandCode}
- Realista (R): ${score.R}/40
- Investigativo (I): ${score.I}/40
- Artístico (A): ${score.A}/40
- Social (S): ${score.S}/40
- Empreendedor (E): ${score.E}/40
- Convencional (C): ${score.C}/40
- Índice de Diferenciação: ${score.differentiationIndex} (diferença entre o maior e menor escore)

Sua resposta deve:
1. Ser puramente fundamentada na teoria de Holland e com rigor científico.
2. Usar linguagem direta, acessível e profissional.
3. BARRAR TERMINANTEMENTE qualquer jargão pseudocientífico, misticismo, testes de personalidade pop (MBTI, Eneagrama) ou papo de "autoajuda".
4. Incluir nuances sobre adaptação vocacional e neurodivergência: analisar como esse perfil cognitivo/interesse específico (ex: alto I, baixo S) pode alinhar-se com estilos de processamento cognitivo, necessidades de regulação sensorial e estrutura no mercado de trabalho atual.
5. Cruzar o perfil Holland com 3 áreas profissionais modernas ou tendências de mercado onde a pessoa prosperaria.

A resposta deve ter parágrafos curtos, sem marcação markdown como asteriscos pesados ou títulos grandes (use formatação limpa e corrida que será renderizada em um box de texto pequeno). Seja objetivo e focado na clínica.
`;

  try {
    const response = await callAIProxy(
      'generate_content', 
      {
        model: AI_MODELS.FAST_TASKS,
        contents: prompt,
        config: {
          temperature: 0.3,
        }
      },
      'generateVocationalAnalysis',
      onProgress
    );

    return response.text || "Análise indisponível no momento.";
  } catch (error: unknown) {
    console.error("Error generating vocational analysis:", error);
    throw error;
  }
};

/**
 * Avaliação Cognitiva: Transforma escores brutos em psicoeducação para o paciente.
 */
export async function generateCognitiveAnalysis(
  taskType: 'stroop' | 'corsi',
  scoreData: any,
  patientAge: number | string,
  onProgress?: (progress: { attempt: number; status: string }) => void
): Promise<string> {
  let prompt = '';

  if (taskType === 'stroop') {
    prompt = `Atue como um neuropsicólogo empático e didático. 
O paciente possui ${patientAge} anos de idade.
Ele acabou de realizar o Teste de Stroop (uma avaliação de Atenção Seletiva e Controle Inibitório).

RESULTADOS BRUTOS:
- Acurácia Geral: ${scoreData.overallAccuracy}%
- Omissões: ${scoreData.omissions}
- Tempo Médio (Congruente): ${scoreData.congruent.meanRT} ms
- Tempo Médio (Neutro): ${scoreData.neutral.meanRT} ms
- Tempo Médio (Incongruente): ${scoreData.incongruent.meanRT} ms
- Efeito de Interferência Global (Incongruente - Congruente): ${scoreData.interferenceEffectMs} ms

DIRETRIZES ESTRITAS:
1. Não faça diagnóstico (é um teste de rastreio).
2. Explique brevemente o que é Atenção Seletiva e Controle Inibitório.
3. Traduza o que significa o "Efeito de Interferência" em termos práticos do dia a dia.
4. Leve em consideração a idade (${patientAge} anos) para normalizar a explicação (ex: lentificação é normal na terceira idade).
5. O tom deve ser acolhedor, psicoeducativo e acessível. 
6. NÃO use linguagem mística, focando apenas em neurociência acessível.`;
  } else if (taskType === 'corsi') {
    prompt = `Atue como um neuropsicólogo empático e didático. 
O paciente possui ${patientAge} anos de idade.
Ele acabou de realizar o Teste dos Cubos de Corsi (uma avaliação de Memória de Trabalho Visuoespacial).

RESULTADOS BRUTOS:
- Span Direto (Maior sequência reproduzida): ${scoreData.directSpan}
- Total de Acertos: ${scoreData.totalCorrectTrials}
- Limite/Teto Atingido: Nível ${scoreData.maxSpanAttempted}

DIRETRIZES ESTRITAS:
1. Não faça diagnóstico (é um teste de rastreio).
2. Explique brevemente o que é Memória de Trabalho Visuoespacial e como a usamos no dia a dia (ex: lembrar caminhos, organizar objetos, dirigir).
3. Traduza o "Span Direto" de ${scoreData.directSpan} como a "capacidade do buffer mental" dele atual. (Lembrando que o mágico número 7±2 geralmente se aplica à memória verbal, a visuoespacial costuma ser ligeiramente menor).
4. Leve em consideração a idade (${patientAge} anos) para contextualizar a performance.
5. O tom deve ser acolhedor e focado em psicoeducação.`;
  }

  try {
    const response = await callAIProxy(
      'generate_content', 
      {
        model: AI_MODELS.FAST_TASKS,
        contents: prompt,
        config: {
          temperature: 0.3,
        }
      },
      `generateCognitiveAnalysis_${taskType}`,
      onProgress
    );

    return response.text || "Análise indisponível no momento.";
  } catch (error) {
    console.error(`Error generating ${taskType} cognitive analysis:`, error);
    throw error;
  }
}

