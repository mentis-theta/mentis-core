import fs from 'fs';
import path from 'path';

const resultsPath = path.join(process.cwd(), 'tests', 'rag', 'e2e_results.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// My clinical evaluation based on analyzing the E2E results
const evaluations = [
  {
    case_id: 'E2E-SUP-001',
    faithfulness: false,
    attribution: true,
    unsupported_claims: 2,
    failure_types: ['GROUNDING'], // hallucinated organic causes and persistent worry criteria
    abstention_pass: null
  },
  {
    case_id: 'E2E-SUP-002',
    faithfulness: false,
    attribution: true,
    unsupported_claims: 1,
    failure_types: ['GROUNDING'], // hallucinated duration of 6 months for agoraphobia (not in chunk)
    abstention_pass: null
  },
  {
    case_id: 'E2E-SUP-003',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [], // perfect
    abstention_pass: null
  },
  {
    case_id: 'E2E-SUP-004',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: null
  },
  {
    case_id: 'E2E-SUP-005',
    faithfulness: false,
    attribution: true,
    unsupported_claims: 1,
    failure_types: ['RETRIEVAL', 'GROUNDING'], // the chunk lacked full info, LLM guessed
    abstention_pass: null
  },
  {
    case_id: 'E2E-ABS-001',
    faithfulness: false, // failed to abstain
    attribution: false,
    unsupported_claims: 2,
    failure_types: ['ABSTENTION', 'GROUNDING'],
    abstention_pass: false
  },
  {
    case_id: 'E2E-ABS-002',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: true
  },
  {
    case_id: 'E2E-ABS-003',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: true
  },
  {
    case_id: 'E2E-ABS-004',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: true
  },
  {
    case_id: 'E2E-ABS-005',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: true
  },
  {
    case_id: 'E2E-HRD-001',
    faithfulness: false,
    attribution: true,
    unsupported_claims: 1,
    failure_types: ['GROUNDING'], // contradictory chunks confused the model
    abstention_pass: null
  },
  {
    case_id: 'E2E-HRD-002',
    faithfulness: false,
    attribution: false,
    unsupported_claims: 1,
    failure_types: ['GROUNDING', 'ATTRIBUTION'],
    abstention_pass: null
  },
  {
    case_id: 'E2E-HRD-003',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: null
  },
  {
    case_id: 'E2E-HRD-004',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: null
  },
  {
    case_id: 'E2E-HRD-005',
    faithfulness: true,
    attribution: true,
    unsupported_claims: 0,
    failure_types: [],
    abstention_pass: null
  }
];

results.forEach((res, i) => {
  const evalData = evaluations[i];
  if (evalData) {
    res.human_evaluation_labels = {
      faithfulness_pass: evalData.faithfulness,
      attribution_pass: evalData.attribution,
      unsupported_claim_count: evalData.unsupported_claims,
      failure_types: evalData.failure_types
    };
    if (res.type === 'MUST_ABSTAIN') {
      res.abstention.expected = true;
      res.abstention.observed = evalData.abstention_pass === true;
      res.abstention.pass = evalData.abstention_pass;
      res.abstention.reason = evalData.abstention_pass ? "Recusou corretamente devido à falta de evidência" : "Alucinou informações não presentes no contexto em vez de se abster";
    }
  }
});

fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log("Evaluation labels injected.");
