/**
 * RAG Context Builder — Gate 3A
 *
 * Constrói o texto de contexto injetado no prompt do Gemini.
 * Cada chunk é envolvido em tags <source> com atributos de proveniência clínica.
 *
 * Separação semântica:
 * - source_authority + source_version = proveniência da fonte clínica (DSM-5-TR, SCID-5, CID-11)
 * - embedding_model + embedding_revision = modelo vetorial (vive no banco, NÃO vai para o prompt)
 */

/**
 * Mapa de source → source_version legível.
 * Quando o corpus crescer, isso virá do banco.
 */
const SOURCE_VERSION_MAP: Record<string, string> = {
  'DSM-5-TR': '2022_Text_Revision',
  'CID-11': '2022',
  'SCID-5-CV': '2015',
  'Protocolo TCC': 'Contemporâneo',
};

function getSourceVersion(source: string): string {
  return SOURCE_VERSION_MAP[source] || 'unknown';
}

export function buildClinicalContext(ragDocuments: any[] | null): string {
  if (!ragDocuments || ragDocuments.length === 0) {
    return "Nenhum contexto clínico específico encontrado na base de dados.";
  }

  return ragDocuments.map((doc: any) => {
    const chunkId = doc.metadata?.chunk_id || doc.id;
    const sourceAuthority = doc.source || 'unknown';
    const sourceVersion = getSourceVersion(sourceAuthority);
    const code = doc.code || 'N/A';
    const category = doc.category || 'N/A';

    return `<source chunk_id="${chunkId}" source_authority="${sourceAuthority}" source_version="${sourceVersion}" code="${code}" category="${category}">
CONTENT:
${doc.content}
</source>`;
  }).join('\n\n').trim();
}
