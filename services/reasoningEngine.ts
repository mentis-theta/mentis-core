import { ClinicalKnowledgeResult } from './ragService.ts';
import { aggregateEvidence } from './evidenceAggregator.ts';
import { AI_MODELS } from '../config/ai_models.ts';

// ============================================================================
// Tipagem: Evidence Graph & Provenance
// ============================================================================

export interface Provenance {
  chunk_id: string;
  sentenca_exata: string;
  documento_origem: string; 
  pagina_ou_secao?: string;
  versao_documento?: string;
}

export interface EvidenceNode {
  sintoma_ou_fator: string;
  hipotese_clinica: string; // A inferência
  explicacao_baseada_nas_evidencias: string; // A observação / literatura pura
  contraevidencias: string[]; // Mitigação de Premature Closure (o que falta)
  contradições_criticas: string[]; // Fatores no relato que ativamente negam a hipótese (Critérios de Exclusão)
  necessidade_avaliacao: string; // Próximo passo clínico
  confidence_score: number; // Novo: Confiança individual isolada para esta hipótese
  provenance: Provenance[]; 
}

export interface ClinicalReasoningState {
  grafo_evidencias: EvidenceNode[];
  riscos_identificados: string[];
  informacoes_ausentes_checklist: string[]; // Roteiro p/ a próxima entrevista
  confidence_score: number; // Score global herdado da recuperação geral
}

/**
 * Calcula o Confidence Score GLOBAL de recuperação com base nos metadados 
 * de Explainability dos chunks recuperados E agregados.
 */
function calculateConfidence(chunks: ClinicalKnowledgeResult[]): number {
  if (!chunks || chunks.length === 0) return 0.0;
  
  let totalScore = 0;
  let forceCount = 0;
  
  for (const c of chunks) {
    if (c.explainability) {
      totalScore += (c.explainability.authority_weight * c.explainability.rrf_combined_score);
      if (c.explainability.force_retrieved) {
        forceCount++;
      }
    } else {
      totalScore += c.similarity;
    }
  }

  let baseConfidence = (totalScore / chunks.length);
  
  if (forceCount > 0) {
    baseConfidence += 0.1 * forceCount; 
  }

  return Math.min(Math.max(baseConfidence, 0.1), 0.99);
}

/**
 * Constrói o estado estruturado invocando o modelo na camada de AI Proxy.
 */
export async function buildReasoningState(query: string, retrievedChunks: ClinicalKnowledgeResult[]): Promise<ClinicalReasoningState> {
  // 1. Passar pela camada pura de Agregação e Limpeza (Aggregator)
  const aggregatedChunks = aggregateEvidence(retrievedChunks);

  // 2. Prepara o payload com Provenance explícito
  const contextText = aggregatedChunks.map(c => `
--- [ID: ${c.id}] ---
Fonte/Doc: ${c.authority_profile || 'Desconhecida'} | ${c.tipo_documento}
Transtorno/Categoria: ${c.disorder_name} | ${c.category}
Risco: ${c.risk_level}
Texto (Evidência): ${c.content}
`).join('\n');

  const prompt = `
Atue como um Motor de Raciocínio Clínico (Reasoning Engine).
Sua função não é escrever redações, mas construir um GRAFO DE EVIDÊNCIAS E CONTRADIÇÕES estrito (JSON).
Separe completamente o que é INFERÊNCIA (hipótese_clinica) do que é OBSERVAÇÃO (explicacao_baseada_nas_evidencias).
Obrigatório: Extraia e referencie a PROVENIÊNCIA exata (ID do chunk, sentença literal) para garantir rastreabilidade. Foque sempre nas CONTRAEVIDÊNCIAS para evitar confirmação prematura.
POSTURA EPISTEMOLÓGICA OBRIGATÓRIA: Nunca afirme que o paciente possui uma doença ou risco. O sistema atua sobre o texto. Diga sempre que "O relato contém informações compatíveis com o risco...".

NOVO NA V7: 
1. Estime um "confidence_score" probabilístico individual para CADA hipótese (EvidenceNode) variando de 0.0 a 1.0 (ex: 0.78 para TAG).
2. Forneça uma lista exaustiva de dimensões críticas que FALTAM no relato do paciente (informacoes_ausentes_checklist). Ex: "frequência do sintoma", "prejuízo funcional", "duração".
3. Ancore o array "contradições_criticas" usando o conceito de 'Critérios de Exclusão e Diagnóstico Diferencial' dos manuais diagnósticos. Procure ativamente no contexto por relatos que invalidem a hipótese. Exemplo: se a hipótese for Transtorno Depressivo Maior, procure ativamente por episódios maníacos/hipomaníacos; se houver, popule o array e reduza fortemente o Confidence Score, indicando possível virada para Bipolaridade. Separe estritamente de "contraevidencias" (sintomas esperados que apenas não foram relatados).

Query do Psicólogo: "${query}"

Contexto Clínico Recuperado (Limpo & Agrupado):
${contextText}
  `;

  const { supabase } = await import('./supabaseClient.ts');
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      action: 'generate_structured_json',
      payload: {
        model: AI_MODELS.REASONING_TASKS,
        prompt: prompt,
        schema: 'clinical_reasoning_v2_graph' 
      }
    }
  });

  if (error) {
    console.error('[ReasoningEngine] Erro ao invocar LLM:', error);
    return {
      grafo_evidencias: [],
      riscos_identificados: ["Erro ao conectar ao Reasoning Engine API."],
      informacoes_ausentes_checklist: [],
      confidence_score: calculateConfidence(aggregatedChunks)
    };
  }

  const state: ClinicalReasoningState = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  state.confidence_score = calculateConfidence(aggregatedChunks);

  return state;
}
