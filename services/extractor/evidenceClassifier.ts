import { Evidence, CallMetadata, EvidenceLevel } from '../../types';
import { ResolvedCandidate } from './ontologyResolver';
import { callGeminiAPI, parseLLMJSON } from '../../utils/aiUtils';
import { ClassifierResponseSchema } from '../../schemas/extractorSchema';
import { dispatch_clinical_events } from '../ops/eventBus';

export interface ClassifiedEvidence extends ResolvedCandidate {
    evidence: Evidence;
    evidence_level: number;
    value: string | number;
}

/**
 * Módulo de Classificação de Evidência (Evidence Classifier)
 * 
 * Separa a atribuição de origem (paciente, psicólogo) e força clínica (indireta, direta)
 * do processo de identificação de conceitos. Isso pode ser feito via heurística ou via LLM.
 * Aqui usaremos o LLM em modo "Classificador", não Extrator.
 */
export async function classifyEvidence(resolved: ResolvedCandidate[], sessionIds: string[]): Promise<{ classifications: ClassifiedEvidence[], metadata?: CallMetadata }> {
    if (resolved.length === 0) return { classifications: [] };

    // Fica apenas com os que passaram pelo gate
    const validCandidates = resolved.filter(r => r.status === 'matched');
    if (validCandidates.length === 0) return { classifications: [] };

    const prompt = `Você é um CLASSIFICADOR DE EVIDÊNCIA CLÍNICA.
Analise os contextos das extrações abaixo e determine a Origem, Força, Certeza e Nível de Evidência.

REGRAS RÍGIDAS:
1. origin: 'patient' (se o paciente relatou) ou 'psychologist' (se o psicólogo inferiu/observou comportamento).
2. strength: 'direct' (observação direta ex: choro), 'indirect' (relato de terceiro), 'clinicalInference' (raciocínio profissional).
3. certainty: 'high', 'moderate', 'low'. Relato vago é low.
4. evidence_level: classifique o Fato/Sintoma extraído na escala de 1 a 5 (1=Impressão inicial, 2=Hipótese clínica, 3=Relato do paciente, 4=Observação repetida do terapeuta/sinal vital, 5=Teste psicométrico/padronizado). Em caso de dúvida ou ambiguidade no texto, você DEVE ancorar o nível para baixo (1 ou 2). Níveis 4 e 5 exigem menção explícita de observação visual in loco ou aplicação de ferramenta psicométrica.

ENTRADAS A CLASSIFICAR:
${validCandidates.map((c, i) => `[ID ${i}]: Conceito: ${c.candidate.suggestedConcept} | Texto: ${c.candidate.rawText} | Contexto: ${c.candidate.context}`).join('\n')}

Devolva ESTRITAMENTE um array JSON contendo as classificações ordenadas pelo ID, válido contra este JSON Schema:
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "origin": { "type": "string" },
      "strength": { "type": "string" },
      "certainty": { "type": "string" },
      "evidence_level": { "type": "integer", "minimum": 1, "maximum": 5 },
      "value": { "type": ["string", "number"] }
    },
    "required": ["id", "origin", "strength", "certainty", "evidence_level", "value"]
  }
}

Exemplo:
[
  {
    "id": 0,
    "origin": "patient",
    "strength": "direct",
    "certainty": "high",
    "evidence_level": 3,
    "value": "relato de dificuldade para dormir"
  }
]
`;

    const { text: generatedText, metadata } = await callGeminiAPI(prompt, true);
    
    try {
        const rawParsed = parseLLMJSON<any[]>(generatedText) || [];
        const parseResult = ClassifierResponseSchema.safeParse(rawParsed);
        
        if (!parseResult.success) {
            dispatch_clinical_events({
                type: 'TELEMETRY',
                level: 'error',
                message: 'Falha de validação Zod no Evidence Classifier. Usando fallback bruto.',
                metadata: { error: parseResult.error.message }
            });
        }
        
        const parsed = parseResult.success ? parseResult.data : rawParsed;

        const classifications = validCandidates.map((cand, index) => {
            const cls = parsed.find((p: any) => p.id === index);
            
            // Defesa contra boolean vindo do fallback ou parse maluco
            let safeValue: string | number = cand.candidate.rawText;
            if (cls?.value !== undefined && typeof cls.value !== 'boolean') {
                safeValue = cls.value;
            } else if (typeof cls?.value === 'boolean') {
                dispatch_clinical_events({
                    type: 'TELEMETRY',
                    level: 'warn',
                    message: 'Evidence Classifier retornou boolean no value. Substituído por rawText.',
                    metadata: { concept: cand.candidate.suggestedConcept }
                });
            }

            return {
                ...cand,
                evidence_level: cls?.evidence_level || 1,
                value: safeValue,
                evidence: {
                    origin: cls?.origin || 'psychologist',
                    strength: cls?.strength || 'clinicalInference',
                    certainty: cls?.certainty || 'moderate',
                    confidence: cand.candidate.confidence,
                    source_refs: sessionIds,
                    derivedFrom: []
                }
            };
        });
        return { classifications, metadata };
    } catch (e) {
        dispatch_clinical_events({
            type: 'TELEMETRY',
            level: 'error',
            message: 'Falha fatal no Evidence Classifier, usando fallback para todos.',
            metadata: { error: e instanceof Error ? e.message : String(e) }
        });

        // Retorna fallback para todos os candidatos
        const classifications = validCandidates.map(cand => ({
            ...cand,
            evidence_level: 1,
            value: cand.candidate.rawText,
            evidence: {
                origin: 'psychologist' as const,
                strength: 'clinicalInference' as const,
                certainty: 'moderate' as const,
                confidence: cand.candidate.confidence,
                source_refs: sessionIds,
                derivedFrom: []
            }
        }));
        
        return { classifications };
    }
}
