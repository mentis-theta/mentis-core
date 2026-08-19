import { useState } from 'react';
import { generateClinicalDocument, type PatientDataContext } from '@/services/aiDocumentService';
import { parseLLMJSON } from '@/utils/aiUtils';
import { getTemplateById } from '@/components/Documents/documentTemplates';
import type { DocumentTemplate, Patient, User, DocumentPurpose } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';

export interface DiffData {
    originalText: string;
    aiText: string;
    originalStructured: Record<string, string>;
    aiStructured: Record<string, string>;
}

interface UseAIGeneratorProps {
    selectedTemplate: DocumentTemplate | null;
    selectedPatient: Patient | null;
    currentUser: User | null;
    editorContent: string;
    structuredContent: Record<string, string>;
    setEditorContent: (content: string) => void;
    setStructuredContent: (content: Record<string, string>) => void;
    documentPurpose: DocumentPurpose;
}

export function useAIGenerator({
    selectedTemplate,
    selectedPatient,
    currentUser,
    editorContent,
    structuredContent,
    setEditorContent,
    setStructuredContent,
    documentPurpose
}: UseAIGeneratorProps) {
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [diffData, setDiffData] = useState<DiffData | null>(null);
    const { addToast } = useToast();
    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(selectedPatient?.id || '', 'full_audit');

    const handleGenerateAI = async (userInstructions?: string) => {
        if (!selectedTemplate || !selectedPatient || !currentUser) {
            addToast('Selecione um modelo e um paciente primeiro.', 'error');
            return;
        }

        if (isLoadingDecoupled || !decoupledData) {
            addToast('Aguarde os dados clínicos serem descriptografados. Tente novamente em alguns segundos.', 'warning');
            return;
        }

        const template = getTemplateById(selectedTemplate);
        let hasContent = false;

        if (template?.structure === 'structured') {
            hasContent = Object.values(structuredContent).some(v => v.trim() !== '' && v.trim() !== '<p></p>');
        } else {
            hasContent = editorContent.trim() !== '' && editorContent.trim() !== '<p></p>';
        }

        if (hasContent) {
            if (!window.confirm('A IA usará o seu texto atual como base para expandir o documento. Deseja continuar?')) {
                return;
            }
        }

        setIsGeneratingAI(true);
        addToast(' Gerando conteúdo com IA...', 'info');

        try {
            const context: PatientDataContext = {
                patient: selectedPatient,
                sessions: decoupledData.sessions,
                anamnesis: selectedPatient.anamnesis,
                diagnosis: selectedPatient.anamnesis?.diagnosticHypothesis,
                medications: selectedPatient.anamnesis?.medications,
                currentDraftText: editorContent,
                currentStructuredDraft: structuredContent,
                purpose: documentPurpose
            };

            if (!template) throw new Error('Template não encontrado.');

            const generatedContent = await generateClinicalDocument(template, context, userInstructions);

            let finalParsedData: Record<string, string> | null = null;
            let finalEditorText = generatedContent;

            if (template?.structure === 'structured') {
                try {
                    const parsedData = parseLLMJSON<Record<string, string>>(generatedContent);
                    const newStructuredContent: Record<string, string> = {};

                    template.sections?.forEach((sec, index) => {
                        const sectionTitle = typeof sec === 'string' ? sec : ('title' in sec ? (sec as { title: string }).title : `Seção ${index + 1}`);
                        const matchedKey = Object.keys(parsedData).find(k => k.toLowerCase() === sectionTitle.toLowerCase() || k.includes(sectionTitle.replace(/^\\d+\\.\\s*/, '')));
                        const content = matchedKey ? parsedData[matchedKey] : parsedData[sectionTitle] || Object.values(parsedData)[index] || '';
                        newStructuredContent[sectionTitle] = content;
                    });
                    finalParsedData = newStructuredContent;
                } catch (parseError) {
                    throw new Error('Falha na formatação da IA. Tente gerar novamente.');
                }
            }

            if (documentPurpose === 'inss_forensic') {
                setDiffData({
                    originalText: editorContent,
                    aiText: finalEditorText,
                    originalStructured: structuredContent,
                    aiStructured: finalParsedData || {}
                });
            } else {
                if (finalParsedData) {
                    setStructuredContent(finalParsedData);
                } else {
                    setEditorContent(finalEditorText);
                }
                addToast(' Conteúdo gerado! Revise e edite antes de gerar o PDF.', 'success');
            }
        } catch (error: unknown) {
 console.error('Erro ao gerar com IA:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar conteúdo.';
 addToast(errorMessage, 'error');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const commitAIChanges = () => {
        if (!diffData) return;
        if (Object.keys(diffData.aiStructured).length > 0) {
            setStructuredContent(diffData.aiStructured);
        } else {
            setEditorContent(diffData.aiText);
        }
        setDiffData(null);
        addToast('Alterações de sigilo e PBE aplicadas com sucesso.', 'success');
    };

    const cancelAIChanges = () => {
        setDiffData(null);
    };

    return {
        isGeneratingAI,
        diffData,
        handleGenerateAI,
        commitAIChanges,
        cancelAIChanges
    };
}
