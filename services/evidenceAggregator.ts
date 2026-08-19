import { ClinicalKnowledgeResult } from './ragService.ts';

/**
 * Evidence Aggregator
 * Limpa, agrupa, desduplica e prioriza os chunks brutos da busca
 * antes de enviá-los ao Reasoning Engine.
 */

export function aggregateEvidence(chunks: ClinicalKnowledgeResult[]): ClinicalKnowledgeResult[] {
  if (!chunks || chunks.length === 0) return [];

  // 1. Deduplicação por conteúdo exato (espelhos textuais)
  const uniqueContents = new Set<string>();
  let deduplicated: ClinicalKnowledgeResult[] = [];
  
  for (const chunk of chunks) {
    // Normalizamos um pouco para não esbarrar em espaços
    const hashTxt = chunk.content.trim().toLowerCase();
    
    if (uniqueContents.has(hashTxt)) {
      // Já existe, mas vamos checar conflito de autoridade
      // Se a nova cópia tem mais autoridade, a gente substitui a anterior
      const existingIdx = deduplicated.findIndex(c => c.content.trim().toLowerCase() === hashTxt);
      if (existingIdx !== -1) {
        const existingAuth = deduplicated[existingIdx].explainability?.authority_weight || 0.85;
        const newAuth = chunk.explainability?.authority_weight || 0.85;
        if (newAuth > existingAuth) {
          deduplicated[existingIdx] = chunk; // Substitui pela versão mais "forte"
        }
      }
    } else {
      uniqueContents.add(hashTxt);
      deduplicated.push(chunk);
    }
  }

  // 2. Ordenação Primária de Importância Clínica (Clinical Priority Sort)
  // Ordem: 1º CRITICAL/HIGH Risk, 2º Critério DSM, 3º Diagnóstico, 4º Avaliação Inicial, resto
  deduplicated.sort((a, b) => {
    const scoreA = getPriorityScore(a);
    const scoreB = getPriorityScore(b);
    
    // Se a prioridade categórica for diferente, a maior vence
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Desempate por RRF combined score
    const rrfA = a.explainability?.rrf_combined_score || a.similarity;
    const rrfB = b.explainability?.rrf_combined_score || b.similarity;
    return rrfB - rrfA;
  });

  return deduplicated;
}

function getPriorityScore(chunk: ClinicalKnowledgeResult): number {
  if (chunk.risk_level === 'CRITICAL') return 100;
  if (chunk.risk_level === 'HIGH') return 90;
  if (chunk.clinical_intent === 'Critério DSM') return 80;
  if (chunk.clinical_intent === 'Diagnóstico diferencial') return 70;
  if (chunk.clinical_intent === 'Avaliação inicial') return 60;
  if (chunk.clinical_intent === 'Tratamento') return 50;
  return 10;
}
