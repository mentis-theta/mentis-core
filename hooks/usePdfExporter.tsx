import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useToast } from '@/contexts/ToastContext';
import { getTemplateById } from '@/components/Documents/documentTemplates';
import type { DocumentTemplate, Patient, User, Document } from '@/types';
import { ClinicalDocument, type ClinicalDocumentData, type DocumentType } from '@/components/Finance/ClinicalDocument';
import { StructuredReportDocument } from '@/components/Documents/PDFs/StructuredReportDocument';

interface UsePdfExporterProps {
    selectedTemplate: DocumentTemplate | null;
    selectedPatient: Patient | null;
    currentUser: User | null;
    editorContent: string;
    structuredContent: Record<string, string>;
    addDocument: (patientId: string, meta: Omit<Document, 'id' | 'uploadedAt' | 'url'>, file: File) => Promise<void>;
    startTime?: string;
    endTime?: string;
    consentGiven?: boolean;
}

export function usePdfExporter({
    selectedTemplate,
    selectedPatient,
    currentUser,
    editorContent,
    structuredContent,
    addDocument,
    startTime,
    endTime,
    consentGiven
}: UsePdfExporterProps) {
    const [isGenerating, setIsGenerating] = useState(false);
 const { addToast } = useToast();

    const handleGeneratePDF = async () => {
        if (!selectedTemplate || !selectedPatient || !currentUser) {
            addToast('Selecione um modelo e um paciente primeiro.', 'error');
            return;
        }

        if (!currentUser?.crp && !currentUser?.councilNumber) {
            addToast('É obrigatório preencher o CRP no perfil para emitir documentos.', 'error');
            return;
        }

        if (selectedTemplate === 'declaracao' && (!startTime || !endTime)) {
            addToast('Horários de início e término são obrigatórios para a declaração.', 'error');
            return;
        }

        if (selectedTemplate === 'encaminhamento' && !consentGiven) {
            addToast('O consentimento do paciente é obrigatório para encaminhamentos.', 'error');
            return;
        }

        const template = getTemplateById(selectedTemplate);

        if (template?.structure === 'structured') {
            const hasContent = Object.values(structuredContent).some(v => v.trim() !== '' && v.trim() !== '<p></p>');
            if (!hasContent) {
 addToast('O documento está vazio.', 'error');
                return;
            }
        } else {
            if (!editorContent.trim() || editorContent.trim() === '<p></p>') {
 addToast('O documento está vazio.', 'error');
                return;
            }
        }

        setIsGenerating(true);

        try {
            const verificationCode = `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

            let blob: Blob;

            if (template?.structure === 'structured') {
                blob = await pdf(
                    <StructuredReportDocument
                        type={template.id as 'laudo' | 'relatorio'}
                        data={{ sections: structuredContent }}
                        professional={currentUser}
                        patient={selectedPatient}
                        verificationCode={verificationCode}
                    />
                ).toBlob();
            } else {
                let docData: ClinicalDocumentData;
                let docType: DocumentType;

                if (selectedTemplate === 'atestado') {
                    docType = 'atestado';
                    docData = {
                        description: editorContent
                    };
                } else if (selectedTemplate === 'declaracao') {
                    docType = 'declaracao';
                    docData = {
                        startTime,
                        endTime,
                        description: editorContent
                    };
                } else {
                    docType = 'encaminhamento';
                    docData = {
                        referralTo: template?.name || 'Documento',
                        description: editorContent
                    };
                }

                blob = await pdf(
                    <ClinicalDocument
                        type={docType}
                        data={docData}
                        professional={currentUser}
                        patient={selectedPatient}
                        verificationCode={verificationCode}
                    />
                ).toBlob();
            }

            const fileName = `${template?.name.replace(/\\s+/g, '_')}_${selectedPatient.name.split(' ')[0]}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Prepare Document meta info
            const newDoc = {
                name: `${template?.name} - ${new Date().toLocaleDateString('pt-BR')}`,
                type: 'pdf' as const,
                category: 'generated' as const,
                verificationCode,
                contentDraft: {
                    documentType: selectedTemplate,
                    description: editorContent,
                    sections: structuredContent // Persist exact keys
                }
            };

            const file = new File([blob], fileName, { type: 'application/pdf' });

            // Save to DB and Storage
            await addDocument(selectedPatient.id, newDoc, file);

            // Auto download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

 addToast('Documento gerado com sucesso!', 'success');
        } catch (error: unknown) {
 console.error('Error generating PDF:', error);
 addToast('Erro ao gerar documento.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        handleGeneratePDF
    };
}
