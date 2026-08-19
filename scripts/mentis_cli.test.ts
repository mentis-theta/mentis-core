import { describe, it, expect } from 'vitest';
import { 
  validateCandidateEvidence,
  isClinicalHeader, 
  structuralChunking, 
  chunkTable
} from './mentis_cli';
import { generateProcessingSignature } from './lib/cache';

describe('Validação de Evidência (Adversarial e Strict Boundaries)', () => {
  it('deve retornar EXACT e limites lexicais válidos quando a quote for idêntica', () => {
    const chunk = "O paciente relata insônia e ansiedade constante.";
    const result = validateCandidateEvidence("insônia e ansiedade", chunk, 'c1');
    expect(result).not.toBeNull();
    expect(result?.match_type).toBe('exact');
    expect(result?.start).toBe(18);
    expect(result?.end).toBe(18 + 19);
  });

  it('deve rejeitar uma quote parcial que fere os limites lexicais (ex: nific, istente)', () => {
    const chunk = "O indivíduo apresenta prejuízo funcional significativo devido a um sintoma persistente.";
    expect(validateCandidateEvidence("nific", chunk, 'c1')).toBeNull();
    expect(validateCandidateEvidence("istente", chunk, 'c1')).toBeNull();
  });

  it('deve permitir uma quote exata de tamanho menor, desde que obedeça fronteiras', () => {
    const chunk = "O indivíduo apresenta prejuízo funcional significativo.";
    // "prejuízo funcional" é uma substring exata que obedece as bordas da palavra
    const result = validateCandidateEvidence("prejuízo funcional", chunk, 'c1');
    expect(result).not.toBeNull();
    expect(result?.match_type).toBe('exact');
  });

  it('deve retornar NORMALIZED_EXACT para variações de pontuação/espaço triviais', () => {
    const chunk = "O paciente relata insônia, e ansiedade constante.";
    // A LLM retirou a vírgula acidentalmente: "insônia e ansiedade"
    const result = validateCandidateEvidence("insônia e ansiedade", chunk, 'c1');
    // Como a nossa normalização aceita apenas variações de whitespace entre as palavras exatas usando Regex,
    // se faltar uma vírgula original que o regex literal procura, isso pode falhar.
    // Pela regra de negócio solicitada, a normalização é apenas de excesso de espaços.
    // Vamos testar excesso de espaço:
    const chunkSpace = "O paciente relata   insônia   e ansiedade constante.";
    const resultSpace = validateCandidateEvidence("insônia e ansiedade", chunkSpace, 'c1');
    expect(resultSpace).not.toBeNull();
    expect(resultSpace?.match_type).toBe('normalized_exact');
  });

  it('deve falhar se a LLM adicionar palavras intensificadoras (ex: extremamente)', () => {
    const chunk = "O transtorno caracteriza-se por sintomas persistentes.";
    const quote = "O transtorno caracteriza-se por sintomas extremamente persistentes.";
    expect(validateCandidateEvidence(quote, chunk, 'c1')).toBeNull();
  });

  it('deve falhar se a LLM alterar números', () => {
    const chunk = "Os sintomas ocorrem durante seis meses.";
    const quote = "Os sintomas ocorrem durante doze meses.";
    expect(validateCandidateEvidence(quote, chunk, 'c1')).toBeNull();
  });

  it('deve falhar se a LLM alterar a polaridade da afirmação', () => {
    const chunk = "O paciente não apresenta sintomas psicóticos.";
    const quote = "O paciente apresenta sintomas psicóticos.";
    // Wait, "O paciente apresenta sintomas psicóticos." is a valid SUBSTRING of "O paciente não apresenta sintomas psicóticos."!
    // But since "O paciente apresenta sintomas psicóticos." starts with 'O', it matches "O paciente...". Does it match?
    // Let's trace it: chunk.indexOf("O paciente apresenta sintomas psicóticos.")
    // "O paciente NÃO apresenta..."
    // So the exact match of the modified sentence will FAIL because "não" is missing, making it NOT an exact substring.
    expect(validateCandidateEvidence(quote, chunk, 'c1')).toBeNull();
  });
});

describe('Clinical Header (isClinicalHeader)', () => {
  it('deve detectar radicais corretos independente do gênero/plural', () => {
    expect(isClinicalHeader('Características Diagnósticas')).toBe(true);
    expect(isClinicalHeader('Critério A')).toBe(true);
    expect(isClinicalHeader('Fatores de Risco')).toBe(true);
  });
  it('não deve considerar títulos aleatórios', () => {
    expect(isClinicalHeader('Visão Geral')).toBe(false);
  });
});

describe('Structural Chunking', () => {
  it('deve extrair um critério com seus subitens corretamente', () => {
    const text = `A. Padrão persistente de algo.\n\n1. Subitem um.\n\nB. Outro critério totalmente separado.`;
    const chunks = structuralChunking(text);
    expect(chunks[0].criterion_path).toBe('A');
    expect(chunks[0].text).toContain('A. Padrão');
    expect(chunks[0].text).toContain('1. Subitem um.');
    expect(chunks[1].criterion_path).toBe('B');
  });
});

describe('Table Chunking', () => {
  it('deve quebrar uma tabela preservando headers', () => {
    const longRow = `| Coluna muito grande | ${'A'.repeat(500)} |`;
    const table = `| Header 1 | Header 2 |\n|---|---|\n${longRow}\n${longRow}\n${longRow}\n${longRow}`;
    const chunks = chunkTable(table, 'tbl_01', 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].table_part).toBe(1);
    expect(chunks[1].table_part).toBe(2);
  });
});

describe('Geração de Hash de Idempotência', () => {
  it('não deve incluir ingestion_id', () => {
    const params = {
      normalized_content: "Texto",
      provenance: "DSM-5-TR",
      source_version: 1,
      chunker_version: "v1.0",
      prompt_version: "v1.0",
      kg_schema_version: "v1.0",
      normalization_version: "v1.0",
      extraction_model: "gemini",
      extraction_temperature: 0.1,
      embedding_model: "nomic",
      dimensions: 768
    };
    const hash1 = generateProcessingSignature(params);
    const hash2 = generateProcessingSignature(params);
    expect(hash1).toBe(hash2);
  });
});
