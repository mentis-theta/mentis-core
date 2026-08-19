import { useState } from 'react';
import { 
    extractClinicalFacts, 
    generateFromFacts, 
    lintClinicalDocument,
    generateSection,
    type ClinicalFact, 
    type LinterResult,
    type PatientDataContext 
} from '@/services/aiDocumentService';
import type { Session, DocumentTemplate, DocumentPurpose, ValidationIssue } from '@/types';
import { getTemplateById } from '@/components/Documents/documentTemplates';
import { parseLLMJSON } from '@/utils/aiUtils';
import { useToast } from '@/contexts/ToastContext';
import * as Sentry from '@sentry/react';
import { patientMemoryService } from '@/services/patientMemoryService';

export type HITLStation = 'CLOSED' | 'SCOPE' | 'TRIAGE' | 'LINTER';

interface UseHITLPipelineProps {
    patientContext: PatientDataContext;
    selectedTemplateId: DocumentTemplate | null;
    documentPurpose: DocumentPurpose;
    onDocumentGenerated: (editorText: string, structuredData: Record<string, string>) => void;
}

export function useHITLPipeline({
    patientContext,
    selectedTemplateId,
    documentPurpose,
    onDocumentGenerated
}: UseHITLPipelineProps) {
    const { addToast } = useToast();
    const [currentStation, setCurrentStation] = useState<HITLStation>('CLOSED');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Estação 1 State
    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
    
    // Estação 2 State
    const [extractedFacts, setExtractedFacts] = useState<ClinicalFact[]>([]);
    const [approvedFactIds, setApprovedFactIds] = useState<string[]>([]);
    const [clinicalIssues, setClinicalIssues] = useState<ValidationIssue[]>([]);
    
    // Linter State
    const [linterResult, setLinterResult] = useState<LinterResult | null>(null);

    const openPipeline = () => {
        if (!selectedTemplateId || !patientContext.patient) {
            addToast('Selecione um paciente e um modelo de documento.', 'error');
            return;
        }
        
        // The modal will load sessions via useDecoupledData
        setCurrentStation('SCOPE');
    };

    const closePipeline = () => {
        setCurrentStation('CLOSED');
        // Não limpamos o estado para que, se o usuário fechar sem querer, ele possa voltar
    };

    // Estação 1 -> Estação 2
    const handleExtractFacts = async (sessions: Session[]) => {
        if (selectedSessionIds.length === 0) {
            addToast('Selecione ao menos uma sessão para extrair fatos.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const sessionsToExtract = sessions.filter(s => selectedSessionIds.includes(s.id));
            
            // 1. Carrega a memória existente do paciente
            const existingMemory = await patientMemoryService.fetchPatientMemory(patientContext.patient.id);
            
            // 2. Extrai novos fatos fazendo merge contextual com a memória
            const { facts, issues } = await extractClinicalFacts(patientContext.patient.id, sessionsToExtract);
            
            setExtractedFacts(facts);
            setClinicalIssues(issues);
            // Por padrão, aprova todos os fatos extraídos para o usuário apenas desmarcar o que não quer
            setApprovedFactIds(facts.map((f: ClinicalFact) => f.id));
            
            setCurrentStation('TRIAGE');
        } catch (error) {
            Sentry.captureException(error);
            addToast(error instanceof Error ? error.message : 'Erro ao processar as sessões.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Estação 2 -> Estação 3 (Geração Final)
    const handleGenerateDocument = async (additionalInstructions?: string) => {
        if (approvedFactIds.length === 0) {
            addToast('Você precisa aprovar ao menos um fato clínico para gerar o documento.', 'warning');
            return;
        }

        const template = getTemplateById(selectedTemplateId!);
        if (!template) return;

        setIsProcessing(true);
        try {
            const approvedFacts = extractedFacts.filter(f => approvedFactIds.includes(f.id));
            
            const generatedContent = await generateFromFacts(
                approvedFacts,
                template,
                patientContext,
                additionalInstructions
            );

            let finalStructured: Record<string, string> = {};
            let finalEditor = generatedContent;

            if (template.structure === 'structured') {
                try {
                    const parsedData = parseLLMJSON<Record<string, string>>(generatedContent);
                    
                    template.sections?.forEach((sec, index) => {
                        const sectionTitle = typeof sec === 'string' ? sec : ('title' in sec ? (sec as { title: string }).title : `Seção ${index + 1}`);
                        const matchedKey = Object.keys(parsedData).find(k => k.toLowerCase() === sectionTitle.toLowerCase() || k.includes(sectionTitle.replace(/^\d+\.\s*/, '')));
                        const content = matchedKey ? parsedData[matchedKey] : parsedData[sectionTitle] || Object.values(parsedData)[index] || '';
                        finalStructured[sectionTitle] = content;
                    });
                } catch (e) {
                    throw new Error('Falha na formatação da IA. Os blocos não foram gerados corretamente.');
                }
            }

            onDocumentGenerated(finalEditor, finalStructured);
            addToast('Documento gerado com sucesso baseado nos fatos aprovados!', 'success');
            setCurrentStation('CLOSED');
            
            // FASE 2: Upsert dos Fatos na Memória
            try {
                const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                
                const factsToSave = extractedFacts.map(fact => ({
                    id: isValidUUID(fact.id) ? fact.id : crypto.randomUUID(),
                    patient_id: patientContext.patient.id,
                    text: fact.text,
                    type: fact.type,
                    source_refs: fact.source_refs || [],
                    source_type: 'session' as const,
                    status: approvedFactIds.includes(fact.id) ? 'approved' : 'rejected' as 'approved' | 'rejected'
                }));
                
                await patientMemoryService.upsertClinicalFacts(factsToSave);
            } catch (memoryError) {
                console.error('Erro ao salvar fatos na memória:', memoryError);
                // Não bloqueamos o fluxo principal se a memória falhar, apenas logamos
            }
            
            // Limpa o estado após geração bem-sucedida para o próximo laudo
            setExtractedFacts([]);
            setApprovedFactIds([]);
        } catch (error) {
            Sentry.captureException(error);
            addToast(error instanceof Error ? error.message : 'Erro ao gerar o documento.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Linter Clínico (Independente das Estações)
    const handleRunLinter = async (rawText: string, documentNodes: any, templateType?: string) => {
        setIsProcessing(true);
        setCurrentStation('LINTER');
        try {
            const result = await lintClinicalDocument(rawText, documentNodes, templateType);
            setLinterResult(result);
            if (!result.hasIssues || result.issues.length === 0) {
                addToast('O documento está perfeitamente coeso! Nenhum risco encontrado.', 'success');
            }
        } catch (error) {
            Sentry.captureException(error);
            addToast(error instanceof Error ? error.message : 'Erro ao executar a auditoria do Linter.', 'error');
            setCurrentStation('CLOSED');
        } finally {
            setIsProcessing(false);
        }
    };

    // Estação 3: Micro-RAG (Refinar Seção)
    const handleRegenerateSection = async (sectionTitle: string, additionalInstructions?: string): Promise<string | null> => {
        const template = getTemplateById(selectedTemplateId!);
        if (!template || template.structure !== 'structured' || !template.sections) return null;

        const section = template.sections.find(s => 
            (typeof s === 'string' ? s : s.title) === sectionTitle
        );
        if (!section || typeof section === 'string') return null;

        setIsProcessing(true);
        try {
            // Apenas os fatos aprovados
            const approvedFacts = extractedFacts.filter(f => approvedFactIds.includes(f.id));
            
            // Usamos a mesma heurística de geração da seção, passando as instruções adicionais no systemPrompt se existirem
            const originalSystemPrompt = section.systemPrompt;
            const enhancedSection = {
                ...section,
                systemPrompt: additionalInstructions 
                    ? `${originalSystemPrompt}\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO PARA ESTE REFINAMENTO:\n${additionalInstructions}`
                    : originalSystemPrompt
            };

            const result = await generateSection(
                enhancedSection,
                approvedFacts,
                patientContext
            );

            addToast(`Seção "${sectionTitle}" refinada com sucesso!`, 'success');
            return result.htmlContent;
        } catch (error: any) {
            console.error(`Erro ao refinar seção ${sectionTitle}:`, error);
            addToast(error.message || 'Erro ao refinar a seção.', 'error');
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        currentStation,
        isProcessing,
        selectedSessionIds,
        setSelectedSessionIds,
        extractedFacts,
        approvedFactIds,
        setApprovedFactIds,
        clinicalIssues,
        linterResult,
        openPipeline,
        closePipeline,
        handleExtractFacts,
        handleGenerateDocument,
        handleRunLinter,
        handleRegenerateSection
    };
}
