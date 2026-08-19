import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { DocumentTemplate, Patient } from '@/types';
import Button from '../../Button';
import { TEMPLATES, generateVariables, replaceVariables, getTemplateById } from '../../Documents/documentTemplates';
import { pdf } from '@react-pdf/renderer';
import { ClinicalDocument } from '@/components/Finance/ClinicalDocument';
import DocumentEditor from '../../Documents/DocumentEditor';
import { Info, FileText } from 'lucide-react';

interface DocumentBuilderProps {
    patient: Patient;
    canEdit: boolean;
}

const DocumentBuilder: React.FC<DocumentBuilderProps> = ({ patient, canEdit }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);

    // Update editor content when template changes
    useEffect(() => {
        if (!selectedTemplate) {
            setEditorContent('');
            return;
        }

        const template = getTemplateById(selectedTemplate);
        if (!template) return;

        const variables = generateVariables(patient, currentUser);
        const content = replaceVariables(template.defaultContent || '', variables);
        setEditorContent(content);
    }, [selectedTemplate, patient, currentUser]);

    const handleGeneratePDF = async () => {
        if (!selectedTemplate || !currentUser) {
            addToast('Erro ao gerar documento.', 'error');
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

        if (!editorContent.trim()) {
            addToast('O documento está vazio.', 'error');
            return;
        }

        setIsGenerating(true);

        try {
            const verificationCode = `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
            const template = getTemplateById(selectedTemplate);

            // Map template types to document types
            let docData: any;
            let docType: any;

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
            } else if (selectedTemplate === 'laudo') {
                docType = 'laudo';
                docData = {
                    description: editorContent
                };
            } else if (selectedTemplate === 'relatorio') {
                docType = 'relatorio';
                docData = {
                    description: editorContent
                };
            } else {
                // encaminhamento
                docType = 'encaminhamento';
                docData = {
                    referralTo: template?.name || 'Documento',
                    description: editorContent
                };
            }

            const blob = await pdf(
                <ClinicalDocument
                    type={docType}
                    data={docData}
                    professional={currentUser}
                    patient={patient}
                    verificationCode={verificationCode}
                />
            ).toBlob();

            const fileName = `${template?.name.replace(/\s+/g, '_')}_${patient.name.split(' ')[0]}_${new Date().toISOString().split('T')[0]}.pdf`;

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
        } catch (error) {
            console.error('Error generating PDF:', error);
            addToast('Erro ao gerar documento.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const currentTemplate = selectedTemplate ? getTemplateById(selectedTemplate) : null;

    return (
        <div className="space-y-6">
            {/* Template Selection Grid */}
            <div>
                <h4 className="text-sm font-semibold text-foreground-muted mb-3">
                    Selecione o Tipo de Documento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TEMPLATES.map((template) => {
                        const isSelected = selectedTemplate === template.id;
                        return (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template.id)}
                                disabled={!canEdit}
                                className={`
                                    relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                                    ${isSelected
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                        : ' border-border    hover:border-blue-300 dark:hover:border-blue-700  bg-surface   '
                                    }
                                    ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-3xl">{template.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <h5 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-700 dark:text-blue-300' : ' text-on-surface   '}`}>
                                            {template.name}
                                        </h5>
                                        <p className="text-xs text-foreground-muted line-clamp-2">
                                            {template.description}
                                        </p>
                                        {template.sections && (
                                            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-background dark:bg-slate-700 text-foreground-muted ">
                                                {template.sections.length} seções
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* CFP Compliance Notice */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Laudo Psicológico</strong> segue a Resolução CFP 06/2019 com 6 seções obrigatórias, incluindo Referências.
                        </p>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            {selectedTemplate && currentTemplate && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-foreground-muted ">
                                {currentTemplate.icon} {currentTemplate.name}
                            </h4>
                            <p className="text-xs text-foreground-muted mt-0.5">
                                Paciente: <span className="font-medium">{patient.name}</span>
                            </p>
                        </div>
                        <Button
                            onClick={handleGeneratePDF}
                            disabled={isGenerating || !canEdit}
                            size="md"
                            className="shadow-md"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 w-4 h-4" />
                                    Gerar PDF
                                </>
                            )}
                        </Button>
                    </div>

                    <DocumentEditor
                        content={editorContent}
                        onChange={setEditorContent}
                        placeholder="Edite o conteúdo do documento..."
                    />

                    {selectedTemplate === 'declaracao' && (
                        <div className="flex gap-4 p-4 border border-border rounded-lg bg-surface">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-on-surface mb-1">Horário de Início</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-on-surface" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-on-surface mb-1">Horário de Término</label>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-on-surface" />
                            </div>
                        </div>
                    )}

                    {selectedTemplate === 'encaminhamento' && (
                        <div className="flex items-start gap-3 p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <input 
                                type="checkbox" 
                                id="consent" 
                                checked={consentGiven} 
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <label htmlFor="consent" className="text-sm text-amber-900 dark:text-amber-200 cursor-pointer">
                                <span className="font-semibold block mb-1">Consentimento do Paciente (Obrigatório)</span>
                                Declaro que o paciente ou seu responsável legal consentiu com o compartilhamento destas informações clínicas com terceiros, protegendo o sigilo profissional conforme normativas do CFP.
                            </label>
                        </div>
                    )}
                </div>
            )}

            {!selectedTemplate && (
                <div className="text-center py-12 text-foreground-muted flex flex-col items-center">
                    <FileText className="w-10 h-10 mb-3 opacity-50 block" strokeWidth={1.5} />
                    <p className="text-sm">Selecione um tipo de documento acima para começar</p>
                </div>
            )}
        </div>
    );
};

export default DocumentBuilder;
