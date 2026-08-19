import * as fs from 'fs';
import { generateValidationReport, ValidationContextDocument } from '../../supabase/functions/_shared/deterministicValidator.ts';
import { EvidenceChain } from '../../supabase/functions/_shared/evidenceContract.ts';

// Parser para extrair do contexto embutido os ValidationContextDocuments originais
function parseContextFromInjected(injected: string): ValidationContextDocument[] {
  const docs: ValidationContextDocument[] = [];
  const regex = /<source chunk_id="([^"]+)"[^>]*>\s*CONTENT:\n([\s\S]*?)\n<\/source>/g;
  let match;
  while ((match = regex.exec(injected)) !== null) {
    docs.push({
      chunk_id: match[1],
      content: match[2].trim()
    });
  }
  return docs;
}

function runGate3BEvaluation() {
  const dataPath = 'tests/rag/e2e_judge_gate3a.json';
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  let countIdeal = 0;
  let countInvestigateJudge = 0;
  let countLimitationValidator = 0;
  let countInferentialLeap = 0;
  let countProvenanceGen = 0;
  let countClearFailure = 0;
  let countInvestigate = 0;

  console.log(`\n======================================================`);
  console.log(` Gate 3B: Cross-Analysis (Structural x Semantic x Leakage)`);
  console.log(`======================================================\n`);

  for (const caso of dataset) {
    const contextDocs = parseContextFromInjected(caso.context_injected);
    
    // Geração
    const chains: EvidenceChain[] = caso.generation.evidence_chains || [];
    
    // Roda validador determinístico (Gate 3B) sobre os claims gerados
    const report = generateValidationReport(chains, contextDocs);
    
    // Carrega Labels Semânticos (LLM-as-Judge, Gate 3A)
    const judgeLabels = caso.human_evaluation_labels;

    // Queremos parear Claim-a-Claim?
    // No judge_gate3a, temos o agregado por caso, ou o claim_validations?
    // O human_evaluation_labels é por CASO (faithfulness_pass, attribution_pass, failure_types)
    // O caso do E2E-SUP-001 era falho semanticamente.
    // O Validator devolve report.valid_claims e report.invalid_claims
    
    const isStructurallyValid = report.invalid_claims === 0;
    const isSemanticallyFaithful = judgeLabels.faithfulness_pass === true;
    const hasLeakage = judgeLabels.failure_types && judgeLabels.failure_types.includes('GROUNDING');

    let category = '';
    
    if (isStructurallyValid && isSemanticallyFaithful && !hasLeakage) {
        category = '🟢 caso ideal';
        countIdeal++;
    } else if (isStructurallyValid && isSemanticallyFaithful && hasLeakage) {
        category = '🟡 investigar judge/leakage';
        countInvestigateJudge++;
    } else if (isStructurallyValid && !isSemanticallyFaithful && hasLeakage) {
        category = '🔴 limitação do validator (ex: SUP-001)';
        countLimitationValidator++;
    } else if (isStructurallyValid && !isSemanticallyFaithful && !hasLeakage) {
        category = '🟠 salto inferencial';
        countInferentialLeap++;
    } else if (!isStructurallyValid && isSemanticallyFaithful && !hasLeakage) {
        category = '🟠 problema de provenance/geração';
        countProvenanceGen++;
    } else if (!isStructurallyValid && !isSemanticallyFaithful && hasLeakage) {
        category = '🔴 falha clara';
        countClearFailure++;
    } else {
        category = '🟡 investigar';
        countInvestigate++;
    }

    console.log(`Caso: ${caso.case_id} (${caso.type})`);
    console.log(`  - Structural: ${isStructurallyValid ? 'VALID' : 'INVALID'}`);
    console.log(`  - Semantic:   ${isSemanticallyFaithful ? 'FAITHFUL' : 'UNFAITHFUL'}`);
    console.log(`  - Leakage:    ${hasLeakage ? 'SIM' : 'NÃO'}`);
    console.log(`  => Classificação: ${category}`);

    if (report.invalid_claims > 0) {
      console.log(`  - Falhas Estruturais:`);
      for (const cv of report.claim_validations) {
        if (cv.status === 'INVALID') {
          console.log(`      Claim: "${cv.claim}" => ${cv.reason}`);
          for (const ev of cv.evidence_results) {
             if (ev.status === 'INVALID') {
                 console.log(`        Evidência (${ev.chunk_id}): ${ev.reason}`);
             }
          }
        }
      }
    }
    console.log('');
  }

  console.log(`======================================================`);
  console.log(` Resumo Analítico (Gate 3B vs 3A)`);
  console.log(`======================================================`);
  console.log(`🟢 caso ideal:                     ${countIdeal}`);
  console.log(`🟡 investigar judge/leakage:       ${countInvestigateJudge}`);
  console.log(`🔴 limitação do validator:         ${countLimitationValidator}`);
  console.log(`🟠 salto inferencial:              ${countInferentialLeap}`);
  console.log(`🟠 problema de provenance/geração: ${countProvenanceGen}`);
  console.log(`🔴 falha clara:                    ${countClearFailure}`);
  console.log(`🟡 investigar (outros):            ${countInvestigate}`);
  console.log(`======================================================\n`);
}

runGate3BEvaluation();
