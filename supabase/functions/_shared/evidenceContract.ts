/**
 * Evidence Contract — Gate 3A
 *
 * Define o contrato de geração que impede o Gemini de usar conhecimento paramétrico.
 * O LLM gera SOMENTE evidence_chains + abstentions.
 * O backend constrói o clinical_summary a partir das chains válidas.
 *
 * Três peças:
 * 1. System Prompt de Contenção (4 regras)
 * 2. User Prompt Builder
 * 3. Transform Layer (GatedClinicalResponse → formato legado)
 */

// =============================================================================
// Types
// =============================================================================

export interface SupportingEvidence {
  chunk_id: string;
  source_authority: string;
  source_version: string;
  exact_quote: string;
}

export interface EvidenceChain {
  claim: string;
  evidence_status: 'supported' | 'partially_supported' | 'insufficient';
  supporting_evidence: SupportingEvidence[];
  limitation?: string;
}

export interface Abstention {
  topic: string;
  reason: string;
}

// O ValidationReport vem do deterministicValidator (Gate 3B)
export interface ValidationReport {
  total_claims: number;
  valid_claims: number;
  invalid_claims: number;
  claim_validations: any[]; // Usando any[] localmente para evitar circular dependency pesada
}

export interface GatedClinicalResponse {
  evidence_chains: EvidenceChain[];
  abstentions: Abstention[];
  meta: {
    total_claims: number;
    supported_claims: number;
    partially_supported_claims: number;
    abstained_claims: number;
  };
}

// =============================================================================
// 1. System Prompt — Contenção
// =============================================================================

export function buildSystemPrompt(): string {
  return `Você é o Mentis Copilot, um motor de raciocínio clínico baseado em evidências recuperadas.

REGRAS ABSOLUTAS DE OPERAÇÃO:

REGRA 1 — FAITHFULNESS (Universo Factual Fechado)
O contexto recuperado entre as tags <source> é o UNIVERSO FACTUAL COMPLETO para esta resposta.
Você NÃO PODE usar conhecimento paramétrico (aprendido durante o treinamento) para complementar, expandir ou detalhar informações.
Se uma informação não está ESCRITA no contexto entre tags <source>, ela NÃO EXISTE para você nesta interação.

REGRA 2 — ABSTENTION (Três Caminhos)
Para cada tópico relevante da pergunta, avalie:
- Se há evidência suficiente nos chunks → produza um evidence_chain com status "supported"
- Se há evidência parcial → produza um evidence_chain com status "partially_supported" e preencha o campo "limitation"
- Se NÃO há evidência → produza uma entrada em "abstentions" com o motivo. NÃO invente informação.

REGRA 3 — ATTRIBUTION (Citação Literal Obrigatória)
Cada claim DEVE referenciar o chunk_id exato que o sustenta.
O campo exact_quote DEVE ser uma CÓPIA LITERAL (substring exata, caractere por caractere) do texto do chunk referenciado.
NÃO parafraseie, NÃO resuma, NÃO reordene palavras, NÃO adicione pontuação.

REGRA 4 — PROIBIÇÃO (Barreira Final)
Se uma afirmação clínica não pode ser sustentada por uma sentença EXATA copiada do contexto, essa afirmação é PROIBIDA. Não a faça. Coloque-a em "abstentions".

FORMATO DE SAÍDA:
Retorne ESTRITAMENTE um objeto JSON com esta estrutura (sem markdown, sem texto fora do JSON):
{
  "evidence_chains": [
    {
      "claim": "Afirmação clínica específica e atômica",
      "evidence_status": "supported | partially_supported | insufficient",
      "supporting_evidence": [
        {
          "chunk_id": "ID do chunk entre as tags <source>",
          "source_authority": "Nome da fonte (ex: DSM-5-TR)",
          "source_version": "Versão (ex: 2022_Text_Revision)",
          "exact_quote": "Cópia LITERAL do trecho do chunk que sustenta o claim"
        }
      ],
      "limitation": "Presente apenas se evidence_status = partially_supported"
    }
  ],
  "abstentions": [
    {
      "topic": "Tópico sobre o qual não há evidência",
      "reason": "Nenhum chunk no contexto contém informação sobre..."
    }
  ],
  "meta": {
    "total_claims": 0,
    "supported_claims": 0,
    "partially_supported_claims": 0,
    "abstained_claims": 0
  }
}

ATENÇÃO: Você NÃO deve gerar um campo "clinical_summary" ou "narrative". Sua saída é EXCLUSIVAMENTE evidence_chains, abstentions e meta.`;
}

// =============================================================================
// 2. User Prompt Builder
// =============================================================================

export function buildUserPrompt(contextText: string, query: string): string {
  return `CONTEXTO CLÍNICO (Base de Conhecimento RAG):
${contextText}

RELATO DO CASO / PERGUNTA CLÍNICA:
"${query}"

Analise a demanda acima utilizando EXCLUSIVAMENTE o contexto clínico fornecido.
Retorne o JSON conforme o formato especificado nas instruções do sistema.`;
}

// =============================================================================
// 3. Transform Layer — GatedClinicalResponse → Formato Legado
// =============================================================================

/**
 * Constrói o clinical_summary NO BACKEND, derivado exclusivamente
 * das evidence_chains com status 'supported' ou 'partially_supported'.
 *
 * O LLM NUNCA gera o summary — isso fecha a porta de fuga.
 */
function buildDerivedSummary(response: GatedClinicalResponse): string {
  const supportedClaims = response.evidence_chains
    .filter(ec => ec.evidence_status === 'supported' || ec.evidence_status === 'partially_supported')
    .map(ec => {
      let text = ec.claim;
      if (ec.evidence_status === 'partially_supported' && ec.limitation) {
        text += ` (Limitação: ${ec.limitation})`;
      }
      return text;
    });

  if (supportedClaims.length === 0 && response.abstentions.length > 0) {
    return 'Não há evidência suficiente no material clínico recuperado para sustentar afirmações sobre este caso. ' +
      response.abstentions.map(a => a.reason).join(' ');
  }

  if (supportedClaims.length === 0) {
    return 'Nenhuma evidência clínica recuperada para esta consulta.';
  }

  let summary = supportedClaims.join('. ') + '.';

  // Adicionar abstentions como limitações declaradas
  if (response.abstentions.length > 0) {
    summary += '\n\nLimitações identificadas: ' +
      response.abstentions.map(a => `${a.topic}: ${a.reason}`).join('; ') + '.';
  }

  return summary;
}

/**
 * Converte GatedClinicalResponse para o formato legado { state, narrative }
 * que o frontend espera, sem alterar o frontend.
 * Recebe opcionalmente o validationReport do Gate 3B para auditoria.
 */
export function transformToLegacyFormat(gatedResponse: GatedClinicalResponse, validationReport?: ValidationReport): any {
  // Construir grafo_evidencias a partir das evidence_chains
  const grafoEvidencias = gatedResponse.evidence_chains
    .filter(ec => ec.evidence_status !== 'insufficient')
    .map(ec => ({
      sintoma_ou_fator: ec.claim,
      hipotese_clinica: ec.supporting_evidence.length > 0
        ? `Baseado em ${ec.supporting_evidence[0].source_authority}`
        : 'Evidência parcial',
      explicacao_baseada_nas_evidencias: ec.claim,
      contraevidencias: ec.evidence_status === 'partially_supported' && ec.limitation
        ? [ec.limitation]
        : [],
      necessidade_avaliacao: ec.evidence_status === 'partially_supported'
        ? ec.limitation || 'Avaliação complementar necessária'
        : '',
      confidence_score: ec.evidence_status === 'supported' ? 0.95 : 0.6,
      provenance: ec.supporting_evidence.map(se => ({
        chunk_id: se.chunk_id,
        sentenca_exata: se.exact_quote,
        documento_origem: se.source_authority
      }))
    }));

  // Informações ausentes = abstentions
  const informacoesAusentes = gatedResponse.abstentions.map(a =>
    `${a.topic}: ${a.reason}`
  );

  // Confidence baseada na proporção de claims suportados
  const totalClaims = gatedResponse.meta.total_claims || 1;
  const supportedRatio = gatedResponse.meta.supported_claims / totalClaims;
  const overallConfidence = Math.round(supportedRatio * 100) / 100;

  return {
    state: {
      grafo_evidencias: grafoEvidencias,
      riscos_identificados: [], // Derivado das chains quando houver risk chunks
      informacoes_ausentes_checklist: informacoesAusentes,
      confidence_score: overallConfidence
    },
    narrative: buildDerivedSummary(gatedResponse),
    // Metadados internos do Gate 3 (não expostos no frontend atual, mas disponíveis para auditoria)
    _gate3_meta: {
      evidence_chains: gatedResponse.evidence_chains,
      abstentions: gatedResponse.abstentions,
      meta: gatedResponse.meta,
      deterministic_validation: validationReport || null
    }
  };
}
