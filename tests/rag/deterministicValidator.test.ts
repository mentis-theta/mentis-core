import { validateEvidenceChain, ValidationContextDocument } from '../../supabase/functions/_shared/deterministicValidator.ts';
import { EvidenceChain } from '../../supabase/functions/_shared/evidenceContract.ts';

function runTest(name: string, claim: EvidenceChain, context: ValidationContextDocument[], expectedStatus: string, expectedReason?: string) {
  const result = validateEvidenceChain(claim, context);
  const passed = result.status === expectedStatus && result.reason === expectedReason;
  if (passed) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Expected: ${expectedStatus} (Reason: ${expectedReason})`);
    console.error(`   Got:      ${result.status} (Reason: ${result.reason})`);
    process.exitCode = 1;
  }
}

// =============================================================================
// Test Cases
// =============================================================================

const docs: ValidationContextDocument[] = [
  { chunk_id: 'CHUNK-1', content: 'O paciente tem transtorno de pânico severo.' },
  { chunk_id: 'CHUNK-2', content: 'Depressão maior apresenta risco de suicídio. Outro detalhe importante.' }
];

console.log('--- Executando testes unitários do Deterministic Validator ---');

// 1. chunk_id válido + quote válido
runTest('1. chunk_id válido + quote válido', {
  claim: 'Paciente tem TP',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'transtorno de pânico severo' }]
}, docs, 'VALID', undefined);

// 2. chunk_id inexistente
runTest('2. chunk_id inexistente', {
  claim: 'Paciente tem TP',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-99', source_authority: 'A', source_version: '1', exact_quote: 'transtorno de pânico severo' }]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 3. quote inexistente
runTest('3. quote inexistente', {
  claim: 'Paciente tem TP',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'transtorno de ansiedade' }]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 4. quote vazio
runTest('4. quote vazio', {
  claim: 'Paciente tem TP',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: '   ' }]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 5. chunk_id válido + quote de outro chunk
runTest('5. quote de outro chunk', {
  claim: 'Depressão',
  evidence_status: 'supported',
  // quote existe no CHUNK-2, mas estamos declarando CHUNK-1
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'risco de suicídio' }]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 6. quote parcial (inexato)
runTest('6. quote parcial (inexato)', {
  claim: 'Depressão',
  evidence_status: 'supported',
  // 'risco de suícidio' (com acento incorreto) ou alterado
  supporting_evidence: [{ chunk_id: 'CHUNK-2', source_authority: 'A', source_version: '1', exact_quote: 'apresenta alto risco de suicídio' }]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 7. quote exatamente igual ao chunk
runTest('7. quote exatamente igual ao chunk', {
  claim: 'TP completo',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'O paciente tem transtorno de pânico severo.' }]
}, docs, 'VALID', undefined);

// 8. múltiplas evidências, todas válidas
runTest('8. múltiplas evidências, todas válidas', {
  claim: 'Comorbidade',
  evidence_status: 'supported',
  supporting_evidence: [
    { chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'transtorno de pânico' },
    { chunk_id: 'CHUNK-2', source_authority: 'A', source_version: '1', exact_quote: 'risco de suicídio' }
  ]
}, docs, 'VALID', undefined);

// 9. múltiplas evidências, uma inválida
runTest('9. múltiplas evidências, uma inválida', {
  claim: 'Comorbidade',
  evidence_status: 'supported',
  supporting_evidence: [
    { chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'transtorno de pânico' },
    { chunk_id: 'CHUNK-2', source_authority: 'A', source_version: '1', exact_quote: 'risco de morte' } // INEXISTENTE
  ]
}, docs, 'INVALID', 'contains_invalid_evidence');

// 10. zero evidências
runTest('10. zero evidências', {
  claim: 'Vazio',
  evidence_status: 'supported',
  supporting_evidence: []
}, docs, 'INVALID', 'no_supporting_evidence');

// 11. chunk duplicado (testando comportamento do contexto)
const docsDuplicated: ValidationContextDocument[] = [
  { chunk_id: 'CHUNK-1', content: 'Parte A' },
  { chunk_id: 'CHUNK-1', content: 'Parte B' } // No map, sobrescreve. Mas garantimos que o sistema aceita.
];
runTest('11. chunk duplicado (comporta-se de forma previsível)', {
  claim: 'Test',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'CHUNK-1', source_authority: 'A', source_version: '1', exact_quote: 'Parte B' }]
}, docsDuplicated, 'VALID', undefined);

// 12. caracteres Unicode/acentuação
const docsUnicode: ValidationContextDocument[] = [
  { chunk_id: 'U-1', content: 'Transtorno disfórico pré-menstrual (TDPM) é sério.' }
];
runTest('12. caracteres Unicode (matching exato preservado)', {
  claim: 'TDPM',
  evidence_status: 'supported',
  supporting_evidence: [{ chunk_id: 'U-1', source_authority: 'A', source_version: '1', exact_quote: 'pré-menstrual (TDPM) é sério' }]
}, docsUnicode, 'VALID', undefined);

console.log('\n✅ Todos os testes concluídos.\n');
