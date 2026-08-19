import path from 'path';
import fs from 'fs';

// Funções base (mock) do CLI
function classifyChunk(text: string, category: string, source: string) {
  let risk_level = 'LOW';
  let tipo_documento = 'FeatureChunk';
  let clinical_intent = 'Diagnóstico';
  let peso = source.includes('DSM') ? 1.0 : (source.includes('SCID') || source.includes('CID') ? 0.95 : 0.90);
  
  const textLower = text.toLowerCase();
  const catLower = category.toLowerCase();

  if (/(suicíd|suicid|automutil|morte|risco de vida|autolesão|ideação)/.test(textLower)) {
    risk_level = 'CRITICAL';
  } else if (/(violência|agressão|psicose|catatonia|abstinência grave|risco iminente)/.test(textLower)) {
    risk_level = 'HIGH';
  } else if (/(comorbidade|prejuízo|dificuldade severa)/.test(textLower)) {
    risk_level = 'MEDIUM';
  }

  if (catLower.includes('critério') || textLower.includes('critérios diagnósticos')) {
    tipo_documento = 'CriterionChunk';
    clinical_intent = 'Critério DSM';
  } else if (catLower.includes('tratamento') || textLower.includes('terapia') || catLower.includes('intervenção')) {
    tipo_documento = 'TreatmentChunk';
    clinical_intent = 'Tratamento';
  } else if (catLower.includes('diferencial') || textLower.includes('diferencial')) {
    tipo_documento = 'DifferentialDiagnosisChunk';
    clinical_intent = 'Diagnóstico diferencial';
  } else if (catLower.includes('risco') || risk_level === 'CRITICAL' || risk_level === 'HIGH') {
    tipo_documento = 'RiskChunk';
    clinical_intent = 'Risco';
  } else if (catLower.includes('entrevista') || catLower.includes('avaliação')) {
    tipo_documento = 'InterviewQuestionChunk';
    clinical_intent = 'Avaliação inicial';
  }

  return { risk_level, tipo_documento, clinical_intent, peso };
}

function testParser() {
  const fileContent = `## Transtorno de Insônia
### Critérios Diagnósticos
A. Uma queixa predominante de insatisfação com a quantidade ou qualidade do sono, associado a um (ou mais) dos seguintes sintomas: 
1. Dificuldade em iniciar o sono.
2. Dificuldade em manter o sono, caracterizada por despertares frequentes ou problemas para voltar a dormir após os despertares.

### Características Diagnósticas
Os sintomas duram pelo menos 1 mês,
mas menos de 3 meses.

### Risco de Suicídio
A insônia grave está fortemente associada ao aumento do risco de automutilação, pensamentos suicidas e comportamento suicida ativo. A avaliação deve sempre explorar esse aspecto.

### Nota de Codificação
O código F51.01 se aplica a todos os três especificadores. Codifique também o transtorno mental associado relevante.`;

  const lines = fileContent.split(/\r?\n/);
  const children: any[] = [];
  
  let currentH2 = 'Desconhecido';
  let currentH3 = 'Geral';
  let currentAggregatedChunk = '';
  
  const pushAggregatedChunk = () => {
    if (currentAggregatedChunk.trim().length > 0) {
      const cls = classifyChunk(currentAggregatedChunk, currentH3, 'DSM-5-TR');
      children.push({
        content: `[${currentH2} - ${currentH3}]\n${currentAggregatedChunk.trim()}`,
        disorder_name: currentH2,
        category: currentH3,
        ...cls
      });
      currentAggregatedChunk = '';
    }
  };

  for (const line of lines) {
    let textStr = line.trim();
    if (!textStr) {
      // Empty line means paragraph break.
      // But we are aggregating, so we can just add a newline to currentAggregatedChunk
      if (currentAggregatedChunk.length > 0 && !currentAggregatedChunk.endsWith('\n\n')) {
         currentAggregatedChunk += '\n\n';
      }
      continue;
    }

    const isHeader2 = textStr.startsWith('## ') && !textStr.startsWith('### ');
    const isHeader3 = textStr.startsWith('### ') && !textStr.startsWith('#### ');

    if (isHeader2) {
      pushAggregatedChunk();
      currentH2 = textStr.replace(/^##\s*/, '').trim();
      currentH3 = 'Geral';
      continue;
    } else if (isHeader3) {
      pushAggregatedChunk();
      currentH3 = textStr.replace(/^###\s*/, '').trim();
      continue;
    }

    // Normal text line
    if (currentAggregatedChunk.endsWith('\n\n') || currentAggregatedChunk.length === 0) {
      currentAggregatedChunk += textStr;
    } else {
      currentAggregatedChunk += ' ' + textStr;
    }

    // Check if the current aggregated text should be flushed (e.g. Risk or > 1500 chars)
    const tempClass = classifyChunk(currentAggregatedChunk, currentH3, 'DSM-5-TR');
    if (tempClass.risk_level === 'CRITICAL' || tempClass.risk_level === 'HIGH') {
      pushAggregatedChunk();
    } else if (currentAggregatedChunk.length > 1500) {
      // Only flush on a sentence boundary if possible, but for simplicity here we just flush if it's over 1500 and at the end of a paragraph.
      // Since we process line by line, if a single paragraph exceeds 1500, we should let it finish before pushing, unless we want to break it.
      // Let's just aggregate until it's > 1500 and we hit an empty line (handled above), OR we just force push if it's too big.
      // For now, let's just let it grow. We'll push on headers or empty lines if it's > 1500.
    }
  }
  
  pushAggregatedChunk();

  console.log('Resultados do Chunking:');
  console.dir(children, { depth: null });
}

testParser();
