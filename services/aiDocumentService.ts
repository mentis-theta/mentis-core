import type { Patient, Session, Anamnesis, TemplateDefinition, DocumentPurpose, ClinicalObservation } from '../types';
import { getPlainTextFromSession } from '../components/Session/RichTextRenderer';
import { cleanLLMText, parseLLMJSON, callGeminiAPI } from '@/utils/aiUtils';
import { ontology } from './clinicalOntology';
import { runExtractorPipeline } from './extractor';
import { CFP_TEMPLATE_RULES, INSS_FORENSIC_PROMPT } from './prompts';

/**
 * Patient Data Context for AI Document Generation
 */
export interface PatientDataContext {
    patient: Patient;
    sessions: Session[];
    anamnesis?: Anamnesis | null;
    diagnosis?: string;
    medications?: string;
    currentDraftText?: string;
    currentStructuredDraft?: Record<string, string>;
    purpose?: DocumentPurpose;
}

/**
 * Build prompt for each document type
 */
function buildDocumentPrompt(
    template: TemplateDefinition,
    context: PatientDataContext,
    userInstructions?: string
): string {
    const { patient, sessions, anamnesis, diagnosis, medications } = context;

    // Extract session summaries
    const recentSessions = sessions
        .slice(-5)
        .map(s => {
            const notes = typeof s.notes === 'string' ? s.notes : getPlainTextFromSession(s.notes);
            return `[${new Date(s.date).toLocaleDateString('pt-BR')}] ${s.sessionType}: ${notes}`;
        })
        .join('\n\n');

    const patientInfo = `
Nome: ${patient.name}
Idade: ${patient.birthDate ? calculateAge(patient.birthDate) : 'N/A'} anos
CPF: ${patient.cpf || 'N/A'}
`;

    const clinicalContext = `
Hipótese Diagnóstica: ${diagnosis || 'Não especificada'}
Medicamentos: ${medications || 'Nenhum registrado'}
Queixa Principal: ${anamnesis?.mainComplaint || 'Não registrada'}
`;

    const specificInstructions = template.aiPrompt || '';

    // Build the instruction for the AI to act as a Copilot
    let copilotInstruction = '';

    if (template.structure === 'structured' && context.currentStructuredDraft) {
        const hasDraftContent = Object.values(context.currentStructuredDraft).some(text => text.trim() !== '' && !text.includes('['));
        if (hasDraftContent) {
            copilotInstruction = `
RASCUNHO ATUAL DO PROFISSIONAL:
${JSON.stringify(context.currentStructuredDraft, null, 2)}

INSTRUÇÃO MESTRA (MODO COPILOTO):
O profissional já iniciou o documento com o rascunho em JSON acima.
Sua missão OBRIGATÓRIA é ATUAR COMO UM ASSISTENTE DE ESCRITA:
1. Leia o que o profissional já escreveu em cada chave do JSON.
2. PRESERVE as intenções, frases e termos principais que o profissional digitou. Não apague!
3. EXPANDA o texto do profissional adicionando informações relevantes que encontrar no "DADOS DO PACIENTE", "CONTEXTO CLÍNICO" e "HISTÓRICO DE SESSÕES".
4. Redija melhorando a coesão, consertando possíveis erros e unindo a premissa humana com os detalhes técnicos.
5. Se uma chave do rascunho estiver vazia ou contiver texto com colchetes tipo "[...]", você pode preenchê-la livremente usando o histórico.`;
        }
    } else if (template.structure !== 'structured' && context.currentDraftText && context.currentDraftText.trim() !== '' && context.currentDraftText.trim() !== '<p></p>') {
        copilotInstruction = `
RASCUNHO ATUAL DO PROFISSIONAL:
"${context.currentDraftText}"

INSTRUÇÃO MESTRA (MODO COPILOTO):
O profissional já redigiu o rascunho acima. 
Sua tarefa é EXPANDIR e MELHORAR este rascunho. Preserve a intenção principal descrita no rascunho. 
Adicione contexto clínico se necessário e estruture o texto de forma coesa e em formato profissional.`;
    }

    // Regras Específicas do Template (CFP 06/2019) — centralizadas em prompts.ts
    const ruleGenerator = CFP_TEMPLATE_RULES[template.id];
    const templateSpecificRule = ruleGenerator ? ruleGenerator() : '';

    const prompt = `
${specificInstructions}

${templateSpecificRule}

${copilotInstruction}

${context.purpose === 'inss_forensic' ? INSS_FORENSIC_PROMPT({ diagnosis: diagnosis || '' }) : ''}

DADOS DO PACIENTE:
${patientInfo}

CONTEXTO CLÍNICO:
${clinicalContext}

HISTÓRICO DE SESSÕES (últimas 5):
${recentSessions || 'Nenhuma sessão registrada'}

${userInstructions ? `\nINSTRUÇÕES ADICIONAIS DO TERAPEUTA:\n${userInstructions}` : ''}

IMPORTANTE:
- Use os dados fornecidos para contextualizar o documento
- Mantenha sigilo e ética profissional
- Seja objetivo e técnico
- O terapeuta revisará e editará o conteúdo antes de finalizar
- Se a solicitação for um Relatório ou Laudo, lembre-se de responder APENAS E EXATAMENTE um objeto JSON. Nada fora das chaves {} json.
- Se for atestado, encaminhamento ou declaração, retorne apenas o texto simples, sem formatação markdown (sem \`\`\` text).

Gere o documento agora:
`;

    return prompt;
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}



/**
 * Generate clinical document content using Gemini AI (Legacy/Direct mode)
 */
export async function generateClinicalDocument(
    template: TemplateDefinition,
    context: PatientDataContext,
    userInstructions?: string
): Promise<string> {
    const prompt = buildDocumentPrompt(template, context, userInstructions);
    const { text } = await callGeminiAPI(prompt, template.structure === 'structured');
    return text;
}

// --- FASE 1: HITL (Linha de Montagem) ---

interface CandidateFact {
    rawText: string;
    candidateConcept: string;
    confidence: number;
    origin: 'patient' | 'family' | 'psychologist' | 'psychiatrist' | 'test' | 'medicalRecord';
    strength: 'direct' | 'indirect' | 'standardized' | 'clinicalInference';
    certainty: 'high' | 'moderate' | 'low';
    value: string | boolean | number;
    valueType: 'boolean' | 'numeric' | 'ordinal' | 'text' | 'coded';
    unit?: string;
    qualifier?: string;
    sourceRefs: string[];
}

export interface ClinicalFact {
    id: string;
    text: string;
    type: 'Symptom' | 'Intervention' | 'Report' | 'Observation';
    source_refs: string[];
    confidence: number;
    rawObservation?: ClinicalObservation; // <-- Carrega o dado bruto (origin, concept, certainty) para o SectionBuilder
}

/**
 * Estação 2: Extração de Fatos Clínicos
 * 
 * PADRÃO FACADE (Strangler Fig):
 * Esta função foi mantida por compatibilidade para não quebrar a UI,
 * mas ela agora delega todo o trabalho para o novo pipeline arquitetural.
 */
export async function extractClinicalFacts(
    patientId: string,
    sessions: Session[]
): Promise<{ facts: ClinicalFact[], issues: any[] }> {
    if (!sessions || sessions.length === 0) return { facts: [], issues: [] };
    
    // Delega para o pipeline da Camada 1
    const result = await runExtractorPipeline(patientId, sessions);
    
    // O Facade retorna apenas as observações adaptadas para o frontend legado
    return {
        facts: result.observations.map(obs => ({
            id: obs.id,
            text: typeof obs.value === 'boolean' ? (obs.value ? "Atributo clínico presente" : "Atributo clínico ausente") : String(obs.value),
            type: 'Observation',
            source_refs: obs.evidence.source_refs,
            confidence: obs.evidence.confidence,
            rawObservation: obs
        })) as ClinicalFact[],
        issues: result.warnings // No futuro, isso pode ser a integração direta com MiddlewareResult.issues
    };
}

/**
 * Estação 3: Geração Modular por Seções (O Roteador)
 */
export async function generateSection(
    section: import('@/types').TemplateSection,
    observations: ClinicalFact[],
    context: PatientDataContext
): Promise<{ sectionId: string; htmlContent: string }> {
    // 1. Roteamento: Filtra apenas as observações que a seção tem permissão de consumir
    const allowedOrigins = section.allowedFacts.origins || [];
    const allowedTypes = section.allowedFacts.types || []; // Na v2, cruzaremos isso com a Ontologia

    const routedObservations = observations.filter(fact => {
        const obs = fact.rawObservation;
        if (!obs) return true; // Fallback for legacy facts
        const originMatch = allowedOrigins.length === 0 || allowedOrigins.includes(obs.evidence.origin);
        return originMatch; 
    });

    const factsText = routedObservations.map(fact => {
        const obs = fact.rawObservation;
        if (!obs) return `- ${fact.text}`;
        const conceptName = ontology.getById(obs.conceptId)?.name || 'Conceito Desconhecido';
        return `- [${obs.evidence.origin.toUpperCase()}] ${conceptName} (Certeza: ${obs.evidence.certainty}) - Valor: ${obs.value} ${obs.qualifier || ''}`;
    }).join('\n');

    const fakeContext = { ...context, sessions: [] };
    const baseContext = buildDocumentPrompt({} as any, fakeContext, ''); // Extraímos apenas as infos biográficas do paciente

    const isConclusion = section.title.toLowerCase().includes('conclusão');
    const conclusionHardPrompt = isConclusion 
        ? `\n- REQUISITO ESTRUTURAL OBRIGATÓRIO: Como esta é a "Conclusão", você DEVE preservar ou incluir a frase indicando a VALIDADE TEMPORAL do documento no último parágrafo, não importando a instrução de tom do usuário.` 
        : '';

    const hitlPrompt = `
${baseContext}

=== INSTRUÇÃO DE REDAÇÃO DE SEÇÃO (Micro-RAG) ===
Você é o motor de redação clínica do Mentis. Sua tarefa é redigir EXCLUSIVAMENTE a seção "${section.title}".

=== REGRA DE OURO INQUEBRÁVEL (HARD-PROMPT DE GOVERNANÇA) ===
Independentemente de qualquer instrução de tom solicitada pelo usuário no refinamento, você DEVE:
- Manter o texto SEMPRE na terceira pessoa, de forma impessoal, técnica e objetiva.
- NUNCA usar transcrições literais de fala (sem aspas, sem primeira pessoa do paciente).${conclusionHardPrompt}

Diretriz específica da seção e instrução de refinamento:
${section.systemPrompt}

Fatos Clínicos aprovados e roteados para esta seção:
${factsText ? factsText : 'Nenhum dado objetivo mapeado. Use o contexto biográfico ou preencha com texto padrão se aplicável.'}

=== CONTRATO DE SAÍDA OBRIGATÓRIO ===
Você DEVE retornar um OBJETO JSON VÁLIDO e ESTRITO. Não use markdown por fora do JSON.
O JSON deve ter este exato formato:
{
  "sectionId": "${section.id}",
  "htmlContent": "<h1>${section.title}</h1><p>Seu texto redigido aqui...</p>"
}

ATENÇÃO: O valor de "htmlContent" DEVE ser HTML semântico limpo (h1, h2, p, ul, li). NUNCA retorne JSON AST do TipTap (sem "type": "doc"), retorne HTML puro dentro da string JSON.
`;

    try {
        const { text } = await callGeminiAPI(hitlPrompt, true);
        const parsed = JSON.parse(text);
        return {
            sectionId: parsed.sectionId || section.id,
            htmlContent: parsed.htmlContent || `<p>Falha ao gerar conteúdo.</p>`
        };
    } catch (err) {
        console.error(`Erro ao gerar seção ${section.id}:`, err);
        return { sectionId: section.id, htmlContent: `<p>Erro na geração da seção.</p>` };
    }
}

export async function generateFromFacts(
    observations: ClinicalFact[],
    template: TemplateDefinition,
    context: PatientDataContext,
    userInstructions?: string
): Promise<string> {
    // Se for template simples (sem seções roteáveis), usamos o pipeline antigo adaptado
    if (template.structure !== 'structured' || !template.sections) {
        const factsText = observations.map(fact => {
            const obs = fact.rawObservation;
            if (!obs) return `- ${fact.text}`;
            const conceptName = ontology.getById(obs.conceptId)?.name || 'Conceito Desconhecido';
            return `- [${obs.evidence.origin.toUpperCase()}] ${conceptName} (Certeza: ${obs.evidence.certainty}) - Valor: ${obs.value} ${obs.qualifier || ''}`;
        }).join('\n');
        
        const fakeContext = { ...context, sessions: [] };
        const basePrompt = buildDocumentPrompt(template, fakeContext, userInstructions);
        
        const hitlPrompt = `
${basePrompt}

=== ATENÇÃO: MODO LINHA DE MONTAGEM (HITL) ===
FATOS CLÍNICOS APROVADOS:
${factsText}

Construa o documento utilizando EXCLUSIVAMENTE os Fatos Clínicos acima. Retorne HTML Semântico puro (sem json).
`;

        const { text } = await callGeminiAPI(hitlPrompt, false);
        return text; // Aqui o fallback simples devolve HTML puro
    }

    // Pipeline Modular: Executa todas as seções em paralelo (Velocidade e Isolamento)
    const sectionPromises = template.sections.map(sec => generateSection(sec, observations, context));
    const generatedSections = await Promise.all(sectionPromises);

    // Monta um objeto JSON mapeando sectionId -> htmlContent
    // Isso mantém a compatibilidade com o useHITLPipeline que faz o parseLLMJSON
    const resultObj: Record<string, string> = {};
    generatedSections.forEach(res => {
        resultObj[res.sectionId] = res.htmlContent;
    });
    
    return JSON.stringify(resultObj);
}

export interface LinterResult {
    hasIssues: boolean;
    issues: Array<{
        block: string;
        description: string;
        suggestion: string;
    }>;
}

import { policyEngine } from './linter';
import { LinterTarget, TipTapNode } from './linter/types';

/**
 * Motor de Auditoria Global (Linter Clínico - Fase 8)
 */
export async function lintClinicalDocument(
    rawText: string,
    documentNodes: TipTapNode,
    templateType?: string
): Promise<LinterResult> {
    const target: LinterTarget = { rawText, documentNodes };
    
    try {
        const issues = await policyEngine.evaluate(target, { templateType });
        
        return {
            hasIssues: issues.length > 0,
            issues: issues.map(i => ({
                block: i.location?.nodeId || 'Geral',
                description: `[${i.severity.toUpperCase()}] ${i.message}`,
                suggestion: i.suggestedReplacement || 'Nenhuma sugestão'
            }))
        };
    } catch (err) {
        console.error('Falha no PolicyEngine', err);
        throw new Error('Falha ao rodar o Linter Clínico (Policy Engine).');
    }
}

/**
 * Extração de Fatos Clínicos da Anamnese (Microcamadas 3.1 a 3.3)
 */
export async function extractFactsFromAnamnesis(
    patientId: string,
    anamnesis: Anamnesis
): Promise<ClinicalObservation[]> {
    const anamnesisJson = JSON.stringify(anamnesis, null, 2);

    // --- 3.1 Candidate Extraction ---
    const prompt = `Você é um EXTRATOR DE DADOS CLÍNICOS ESTRUTURADOS. Você atua no "Modo Parser".
Sua função NÃO é analisar, julgar ou criar relatórios. Sua ÚNICA função é converter evidências textuais puras em objetos JSON de extração a partir da Anamnese.

REGRAS RÍGIDAS:
1. Nunca invente conceitos. Apenas extraia.
2. Identifique o "candidateConcept" no formato "dominio.conceito" (ex: "sleep.insomnia", "mood.anxiety"). Se não tiver certeza, use "unknown".
3. Extraia o "rawText" exato que gerou a observação (copie e cole a frase).
4. Como é uma Anamnese (preenchida pelo paciente), a "origin" OBRIGATORIAMENTE é 'patient' e "strength" é 'direct'.
5. O "sourceRefs" será vazio para anamnese, e o ID da sessão não existe.

ANAMNESE:
${anamnesisJson}

Devolva ESTRITAMENTE um array JSON contendo objetos:
[
  {
    "rawText": "A frase exata do texto",
    "candidateConcept": "sleep.insomnia",
    "confidence": 0.95,
    "certainty": "high" | "moderate" | "low",
    "origin": "patient",
    "strength": "direct",
    "value": true,
    "valueType": "boolean" | "text" | "numeric" | "coded",
    "unit": "mg",
    "qualifier": "persistente",
    "sourceRefs": []
  }
]
Não inclua marcações markdown. Retorne apenas o array validamente formatado.`;

    const { text: result } = await callGeminiAPI(prompt, true);
    
    let parsed: CandidateFact[] = [];
    try {
        let rawParsed = parseLLMJSON<any>(result);
        if (rawParsed && typeof rawParsed === 'object' && !Array.isArray(rawParsed)) {
            const arrayValue = Object.values(rawParsed).find(v => Array.isArray(v));
            if (arrayValue) rawParsed = arrayValue;
        }
        if (!Array.isArray(rawParsed)) return [];
        parsed = rawParsed as CandidateFact[];
    } catch (e) {
        throw new Error('Falha ao processar Candidate Extraction da Anamnese.');
    }

    // --- 3.2 Ontology Resolution & 3.3 Observation Builder ---
    const observations: ClinicalObservation[] = [];

    for (const cand of parsed) {
        let finalConceptId = 'unknown';
        if (cand.candidateConcept && cand.candidateConcept !== 'unknown') {
            const resolved = ontology.lookup(cand.candidateConcept);
            if (resolved) finalConceptId = resolved.id;
        }

        observations.push({
            id: crypto.randomUUID(),
            patient_id: patientId,
            conceptId: finalConceptId,
            
            value: cand.value !== undefined && typeof cand.value !== 'boolean' ? cand.value : "Atributo clínico presente",
            valueType: typeof cand.value === 'number' ? 'numeric' : 'text',
            unit: cand.unit,
            qualifier: cand.qualifier,
            date: new Date().toISOString(),
            isCurrent: true,
            
            evidence: {
                origin: 'patient',
                strength: 'direct',
                confidence: cand.confidence || 0.5,
                certainty: cand.certainty || 'moderate',
                source_refs: []
            },
            derivedFrom: ['Anamnese'],
            status: 'Approved' as any
        });
    }

    return observations;
}
