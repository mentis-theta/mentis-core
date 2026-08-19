import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'clinical_docs', 'DSM-5_Formatado.md');
const backupPath = path.join(process.cwd(), 'clinical_docs', 'DSM-5_Formatado.md.bak');

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// 0. Backup
fs.copyFileSync(filePath, backupPath);
console.log(`[Backup] Criado em ${backupPath}`);

let content = fs.readFileSync(filePath, 'utf-8');
let lines = content.split('\n');

const genericHeaderWords = ['doença', 'comorbidade', 'risco', 'prevalência', 'desenvolvimento', 'transtorno', 'diagnóstico', 'critérios', 'características', 'geral', 'sintomas'];

let fusedHeaders = 0;
let demotedHeaders = 0;
let stitchedSentences = 0;

// Vacina 2: Fusão de Cabeçalhos Fracionados
for (let i = 0; i < lines.length - 1; i++) {
  const line = lines[i].trimRight();
  if (/^#{1,3}\s/.test(line)) {
    // Look ahead for the next non-empty line
    let nextNonEmptyIndex = i + 1;
    while (nextNonEmptyIndex < lines.length && lines[nextNonEmptyIndex].trim().length === 0) {
      nextNonEmptyIndex++;
    }

    if (nextNonEmptyIndex < lines.length) {
      const nextLine = lines[nextNonEmptyIndex].trim();
      if (!/^#/.test(nextLine) && nextLine.length < 40 && nextLine.length > 0) {
        lines[i] = line + ' ' + nextLine;
        lines[nextNonEmptyIndex] = ''; 
        fusedHeaders++;
      }
    }
  }
}

// Vacina 3: Rebaixamento de Falsos Cabeçalhos
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^#{2,3}\s+/.test(line)) {
    const rawText = line.replace(/^#{2,3}\s+/, '').trim();
    const lowerText = rawText.toLowerCase();
    
    if (lowerText.split(' ').length <= 3 && genericHeaderWords.some(w => lowerText.includes(w))) {
      lines[i] = lines[i].replace(/^#{2,3}\s+/, ''); 
      demotedHeaders++;
    }
  }
}

// Vacina 1: Costura de Frases (Hard Wraps)
for (let i = 0; i < lines.length - 1; i++) {
  const line = lines[i].trimRight();
  if (line.trim().length === 0) continue;

  let nextNonEmptyIndex = i + 1;
  while (nextNonEmptyIndex < lines.length && lines[nextNonEmptyIndex].trim().length === 0) {
    nextNonEmptyIndex++;
  }

  if (nextNonEmptyIndex < lines.length) {
    const nextLine = lines[nextNonEmptyIndex].trim();
    if (!/[.!?:]$/.test(line) && /^[a-zà-ÿ]/.test(nextLine)) {
      lines[i] = line + ' ' + nextLine;
      lines[nextNonEmptyIndex] = ''; 
      stitchedSentences++;
    }
  }
}

// Remove the artificially blanked out lines from array
lines = lines.filter(l => l.trim() !== '' || l === ''); // Actually, let's just do a join and regex cleanup

content = lines.join('\n');
// Final cleanup of excessive paragraph jumps (more than 2 consecutive newlines)
content = content.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(filePath, content, 'utf-8');

console.log(`\n💉 Vacinas Aplicadas com Sucesso:`);
console.log(`- V1 (Frases Costuradas): ${stitchedSentences}`);
console.log(`- V2 (Cabeçalhos Fundidos): ${fusedHeaders}`);
console.log(`- V3 (Falsos Cabeçalhos Rebaixados): ${demotedHeaders}`);
console.log(`\n✅ O arquivo DSM-5_Formatado.md foi higienizado.`);
