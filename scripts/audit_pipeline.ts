import * as dotenv from 'dotenv';
import path from 'path';
import pc from 'picocolors';
import fs from 'fs';
import { searchClinicalKnowledge } from '../services/ragService.ts';
import { aggregateEvidence } from '../services/evidenceAggregator.ts';
import { buildReasoningState } from '../services/reasoningEngine.ts';
import { generateClinicalNarrative } from '../services/narrativeGenerator.ts';

// Setup environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const TEST_QUERY = "Paciente relata desesperança, choro frequente, mas sem ideação suicida estruturada. Possui insônia leve.";

async function runAudit() {
  console.log(pc.cyan('\n🔬 Iniciando MENTIS AUDIT MODE (Nível 3 Científico)'));
  console.log(pc.white(`Query: "${TEST_QUERY}"\n`));

  const auditLog: any = {
    query: TEST_QUERY,
    timestamp: new Date().toISOString(),
    steps: {}
  };

  try {
    // Passo 1: Recuperação Bruta (Retrieve)
    console.log(pc.gray('[1/4] RAG Retrieve (Busca Híbrida)...'));
    const rawChunks = await searchClinicalKnowledge(TEST_QUERY, 8);
    auditLog.steps.step_1_retrieve = rawChunks.map(c => ({
      id: c.id,
      authority: c.authority_profile,
      risk: c.risk_level,
      content_preview: c.content.substring(0, 50) + '...',
      explainability: c.explainability
    }));

    if (!rawChunks || rawChunks.length === 0) {
      console.log(pc.red('❌ Nenhum resultado. Auditoria encerrada.'));
      return;
    }

    // Passo 2: Agregação (Evidence Aggregator)
    console.log(pc.gray('[2/4] Evidence Aggregator (Deduplicação e Conflitos)...'));
    const aggregatedChunks = aggregateEvidence(rawChunks);
    auditLog.steps.step_2_aggregator = aggregatedChunks.map(c => ({
      id: c.id,
      authority: c.authority_profile,
      risk: c.risk_level,
      content_preview: c.content.substring(0, 50) + '...'
    }));
    
    // Passo 3: Raciocínio Clínico (Reasoning Engine / Graph)
    console.log(pc.gray('[3/4] Reasoning Engine (Provenance Graph)...'));
    // Passamos os brutos porque o Reasoning chama o aggregator internamente, mas aqui passamos agregado direto pra mockar se ele não chamasse, ou melhor: o reasoning engine chama o aggregator internamente, então só passamos o bruto.
    const state = await buildReasoningState(TEST_QUERY, rawChunks);
    auditLog.steps.step_3_reasoning_state = state;

    // Passo 4: Geração de Narrativa (Narrative Generator)
    console.log(pc.gray('[4/4] Narrative Generator...'));
    const narrative = await generateClinicalNarrative(state);
    auditLog.steps.step_4_narrative = narrative;

    // Salvar Log em disco
    const filename = `audit_log_${Date.now()}.json`;
    const outputPath = path.resolve(process.cwd(), filename);
    fs.writeFileSync(outputPath, JSON.stringify(auditLog, null, 2));

    console.log(pc.green(`\n✅ Auditoria Completa. Log estruturado gravado em: ${filename}`));
    console.log(pc.magenta('Você pode utilizar este log para debug científico ou auditoria médica de decisão.'));

  } catch (error) {
    console.error(pc.red('\n❌ Erro durante a pipeline de auditoria:'), error);
  }
}

runAudit();
