import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const groqKey = process.env.VITE_GROQ_API_KEY;

if (!groqKey) {
  console.error("Missing VITE_GROQ_API_KEY in .env");
  process.exit(1);
}

// Configurações Globais / Methodology Config
const MODEL_ID = "llama-3.3-70b-versatile";
const MODEL_VERSION = "groq-hosted";
const TEMPERATURE = 0.0;
const PROMPT_VERSION = "v1.0";
const SCHEMA_VERSION = "v1.0";
const DATASET_VERSION = "v1.0";
const RUN_COUNT = 3;

console.log("==========================================");
console.log("GATE 3E-2 METHODOLOGY CONFIGURATION");
console.log(`MODEL_ID:       ${MODEL_ID}`);
console.log(`MODEL_VERSION:  ${MODEL_VERSION}`);
console.log(`TEMPERATURE:    ${TEMPERATURE}`);
console.log(`PROMPT_VERSION: ${PROMPT_VERSION}`);
console.log(`SCHEMA_VERSION: ${SCHEMA_VERSION}`);
console.log(`DATASET_VERSION:${DATASET_VERSION}`);
console.log(`RUN_COUNT:      ${RUN_COUNT}`);
console.log("==========================================\n");

const url = `https://api.groq.com/openai/v1/chat/completions`;

interface GoldenCase {
  id: string;
  category: string;
  evidence: string;
  claim: string;
  gold: {
    semantic_support: string;
    relationship_type: string;
  };
}

type EvaluationStatus = 
  | "EVALUATED" 
  | "NOT_EVALUATED_API" 
  | "NOT_EVALUATED_TIMEOUT" 
  | "NOT_EVALUATED_SCHEMA" 
  | "NOT_EVALUATED_PARSE";

interface RunResult {
  status: EvaluationStatus;
  semantic_support?: string;
  relationship_type?: string;
  rationale?: string;
}

interface AuditRecord {
  case_id: string;
  category: string;
  runs: RunResult[];
  model: string;
  evaluator_version: string;
  dataset_version: string;
  temperature: number;
  timestamp: string;
}

const systemPrompt = `You are an expert clinical semantic evaluator.
Evaluate whether the claim is supported by the provided evidence. 
Do not infer missing clinical facts. 
Do not complete the evidence using medical knowledge. 
Do not assume that the claim is true. 
Do not use DSM knowledge unless that information appears in the provided evidence. 
Do not infer patient diagnosis from diagnostic criteria unless the evidence explicitly establishes that the patient satisfies them.

You must output a strictly valid JSON object with the following schema:
{
  "rationale": "Brief evidence-grounded justification...",
  "relationship_type": "DIRECT|DERIVED|PARTIAL_SUPPORT|CLINICAL_INFERENCE|PARAMETRIC_LEAKAGE|UNRELATED|CONTRADICTION",
  "semantic_support": "SUPPORTED|PARTIALLY_SUPPORTED|UNSUPPORTED|CONTRADICTED"
}`;

async function evaluateCaseRun(c: GoldenCase): Promise<RunResult> {
  const userPrompt = `EVIDENCE:\n"${c.evidence}"\n\nCLAIM:\n"${c.claim}"\n\nEvaluate the semantic relationship strictly based on the provided rules.`;

  const requestBody = {
    model: MODEL_ID,
    temperature: TEMPERATURE,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", "content": systemPrompt },
      { role: "user", "content": userPrompt }
    ]
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 429) {
      return { status: "NOT_EVALUATED_API", rationale: "Rate limit exceeded" };
    }
    if (!response.ok) {
      return { status: "NOT_EVALUATED_API", rationale: `API Error: ${response.statusText}` };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return { status: "NOT_EVALUATED_PARSE", rationale: "No text in response" };

    const parsed = JSON.parse(text);
    return {
      status: "EVALUATED",
      semantic_support: parsed.semantic_support,
      relationship_type: parsed.relationship_type,
      rationale: parsed.rationale
    };
  } catch (e: any) {
    if (e.name === 'AbortError') return { status: "NOT_EVALUATED_TIMEOUT" };
    if (e instanceof SyntaxError) return { status: "NOT_EVALUATED_SCHEMA" };
    return { status: "NOT_EVALUATED_API", rationale: e.message };
  }
}

async function processDataset(name: string, filePath: string): Promise<{ audit: AuditRecord[], metrics: any }> {
  console.log(`\n--- Processing Dataset: ${name} ---`);
  const cases: GoldenCase[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const auditRecords: AuditRecord[] = [];

  let evaluatedRuns = 0;
  let correctRuns = 0;
  let falseSupport = 0;
  let falseUnsupported = 0;
  let notEvaluated = 0;
  let exactInterRunAgreement = 0;

  for (const c of cases) {
    console.log(`[Eval] ${c.id} (${c.category})...`);
    const runs: RunResult[] = [];
    let caseEvaluatedRuns = 0;
    
    for (let i = 0; i < RUN_COUNT; i++) {
      const result = await evaluateCaseRun(c);
      runs.push(result);
      if (result.status === "EVALUATED") {
        evaluatedRuns++;
        caseEvaluatedRuns++;
        
        // Wait briefly to avoid completely saturating the API
        await new Promise(r => setTimeout(r, 1000));
      } else {
        // Fallback delay on rate limit
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    let sameSupportCount = 0;
    let firstSupport: string | undefined = undefined;

    for (const res of runs) {
      if (res.status === "EVALUATED") {
        const expectedSupport = c.gold.semantic_support;
        const actualSupport = res.semantic_support;
        
        if (firstSupport === undefined) firstSupport = actualSupport;
        if (actualSupport === firstSupport) sameSupportCount++;

        const isCorrect = expectedSupport === actualSupport;
        const isExpectedUnsupported = expectedSupport === 'UNSUPPORTED' || expectedSupport === 'CONTRADICTED';
        const isActualSupported = actualSupport === 'SUPPORTED' || actualSupport === 'PARTIALLY_SUPPORTED';

        if (!isCorrect) {
          if (isExpectedUnsupported && isActualSupported) falseSupport++;
          else if (!isExpectedUnsupported && !isActualSupported) falseUnsupported++;
        } else {
          correctRuns++;
        }
      } else {
        notEvaluated++;
      }
      
      // Delay to respect quotas (max 15 requests per minute to stay under 20 limit)
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    if (sameSupportCount === RUN_COUNT && firstSupport !== undefined) {
      exactInterRunAgreement++;
    }

    auditRecords.push({
      case_id: c.id,
      category: c.category,
      runs,
      model: MODEL_ID,
      evaluator_version: PROMPT_VERSION,
      dataset_version: DATASET_VERSION,
      temperature: TEMPERATURE,
      timestamp: new Date().toISOString()
    });
  }

  const totalRuns = cases.length * RUN_COUNT;
  const coverage = totalRuns > 0 ? (evaluatedRuns / totalRuns) * 100 : 0;
  const accuracy = evaluatedRuns > 0 ? (correctRuns / evaluatedRuns) * 100 : 0;

  console.log(`\nMetrics for ${name}:`);
  console.log(`- Coverage: ${coverage.toFixed(2)}% (${evaluatedRuns}/${totalRuns} runs evaluated)`);
  console.log(`- Completed-case Accuracy: ${accuracy.toFixed(2)}% (${correctRuns}/${evaluatedRuns} correct)`);
  console.log(`- NOT_EVALUATED_RATE: ${((notEvaluated/totalRuns)*100).toFixed(2)}%`);
  console.log(`- Exact Inter-run Agreement: ${(exactInterRunAgreement / cases.length * 100).toFixed(2)}%`);
  if (falseSupport > 0) console.error(`- ⚠️ False Acceptance (Safety Failure): ${falseSupport}`);
  
  return {
    audit: auditRecords,
    metrics: { coverage, accuracy, falseSupport, falseUnsupported, exactInterRunAgreement }
  };
}

async function runAll() {
  console.log("=== Gate 3E-2: Semantic Evaluator Hardening Pass ===\n");

  const baseDir = path.resolve(process.cwd(), 'tests/rag/semantic');
  
  const results = {
    calibration: await processDataset('Calibration Set', path.join(baseDir, 'calibration.json')),
    holdout: await processDataset('Holdout Set', path.join(baseDir, 'holdout.json')),
    canaries: await processDataset('Canaries (SUP-001)', path.join(baseDir, 'canaries.json'))
  };

  fs.writeFileSync(path.join(baseDir, 'semantic_audit_report.json'), JSON.stringify(results, null, 2));
  console.log(`\nAudit report saved to tests/rag/semantic/semantic_audit_report.json`);
  
  // Canary Safety Check
  const canaryRuns = results.canaries.audit[0].runs;
  const canarySupported = canaryRuns.some(r => r.semantic_support === 'SUPPORTED' || r.semantic_support === 'PARTIALLY_SUPPORTED');
  
  if (canarySupported) {
    console.error("\n❌ Gated failed: Canary SUP-001 passed semantically in at least one run!");
    process.exitCode = 1;
  } else {
    console.log("\n✅ Canary SUP-001 invariant maintained (100% UNSUPPORTED when evaluated).");
  }
}

runAll();
