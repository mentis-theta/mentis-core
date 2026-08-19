
import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, Anamnesis } from '@/types.ts';
import Button from '../Button.tsx';
import { Textarea } from '../Form.tsx';
import { PencilIcon, CheckCircleIcon, ClipboardListIcon, SparklesIcon } from '../Icons';
import { formatDate } from '@/utils/formatters.ts';
import { generateAnamnesisFromSessions } from '@/services/geminiService.ts';
import { extractFactsFromAnamnesis } from '@/services/aiDocumentService.ts';
import { patientMemoryService } from '@/services/patientMemoryService.ts';
import { useToast } from '@/contexts/ToastContext.tsx';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useCrypto } from '@/contexts/CryptoContext';
import ToolGuideButton from '../Tools/ToolGuideButton';
import { searchDiagnostics, type DiagnosticReference } from '@/services/diagnosticReferenceService';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
interface AnamnesisTabProps {
    patient: Patient;
    onSave: (anamnesis: Anamnesis) => void;
    canEdit: boolean;
}

const emptyAnamnesis: Anamnesis = {
    mainComplaint: '',
    historyOfPresentIllness: '',
    personalHistory: '',
    familyHistory: '',
    medicalPsychiatricHistory: '',
    lifestyle: '',
    observation: '',
    lastUpdated: new Date().toISOString()
};

const AnamnesisTab: React.FC<AnamnesisTabProps> = ({ patient, onSave, canEdit }) => {
 const { addToast } = useToast();
    const confirm = useConfirm();
    const { masterKey } = useCrypto();
    // Initialize with existing data or empty structure
    const initialData = useMemo(() => patient.anamnesis || {
        ...emptyAnamnesis,
        medicalPsychiatricHistory: patient.medicalHistory || ''
    }, [patient.anamnesis, patient.medicalHistory]);

    const [formData, setFormData] = useState<Anamnesis>(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [diagnosticSuggestions, setDiagnosticSuggestions] = useState<DiagnosticReference[]>([]);
    
    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'summary');

    // Update local state if patient prop changes externally
    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    // Check for unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        if (!isEditing) return false;
        // Compare simplified versions to avoid issues with undefined vs null or property order
        const cleanInitial = JSON.stringify({ ...initialData, lastUpdated: '' });
        const cleanCurrent = JSON.stringify({ ...formData, lastUpdated: '' });
        return cleanInitial !== cleanCurrent;
    }, [formData, initialData, isEditing]);

    const handleChange = (field: keyof Anamnesis, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDiagnosticChange = (value: string) => {
        handleChange('diagnosticHypothesis', value);
        
        // Extrai o termo atual (última linha, após última vírgula)
        const lines = value.split('\n');
        const currentLine = lines[lines.length - 1].trim();
        const terms = currentLine.split(/[,;]/);
        const currentTerm = terms[terms.length - 1].trim();

        if (currentTerm.length > 2) {
            setDiagnosticSuggestions(searchDiagnostics(currentTerm));
        } else {
            setDiagnosticSuggestions([]);
        }
    };

    const applyDiagnosticSuggestion = (suggestion: DiagnosticReference) => {
        const value = formData.diagnosticHypothesis || '';
        const lines = value.split('\n');
        const currentLine = lines[lines.length - 1];
        
        const terms = currentLine.split(/[,;]/);
        terms.pop(); // Remove o termo incompleto
        
        const prefix = terms.length > 0 ? terms.join(', ') + ', ' : '';
        // O \n no início é evitado, apenas montamos a linha atual
        const newEntry = `${suggestion.code} - ${suggestion.dsm5Label}`;
        
        lines[lines.length - 1] = prefix + newEntry;
        
        handleChange('diagnosticHypothesis', lines.join('\n'));
        setDiagnosticSuggestions([]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const dataToSave = {
            ...formData,
            lastUpdated: new Date().toISOString()
        };

        onSave(dataToSave);
        setIsEditing(false);
        setIsSaving(false);

        // Dispara a extração inteligente da anamnese em background (Fire and Forget)
        extractFactsFromAnamnesis(patient.id, dataToSave)
            .then(facts => {
                if (facts && facts.length > 0) {
                    // Substitui patient_id pelo correto
                    const factsWithPatientId = facts.map(f => ({ ...f, patient_id: patient.id }));
                    patientMemoryService.upsertClinicalFacts(factsWithPatientId);
                }
            })
            .catch(e => console.error('Erro silencioso na extração de memória da anamnese:', e));
    };

    const handleCancelAttempt = () => {
        if (hasUnsavedChanges) {
            setShowExitConfirmation(true);
        } else {
            handleConfirmCancel();
        }
    };

    const handleConfirmCancel = () => {
        setIsEditing(false);
        setFormData(initialData);
        setShowExitConfirmation(false);
    };

    const handleGenerateWithAI = async () => {
        if (isLoadingDecoupled) {
            addToast("Aguarde o carregamento do histórico...", "warning");
            return;
        }

        if (!decoupledData?.sessions || decoupledData.sessions.length === 0) {
            addToast("É necessário ter sessões registradas para usar a IA.", "info");
            return;
        }

        const isConfirmed = await confirm({
            title: "Preencher com IA?",
            message: "A IA analisará todas as anotações das sessões para preencher os campos abaixo. Isso substituirá o conteúdo atual do formulário. Deseja continuar?",
            confirmText: "Sim, gerar",
            cancelText: "Cancelar"
        });
        if (!isConfirmed) {
            return;
        }

        setIsGeneratingAI(true);
        try {
            const aiData = await generateAnamnesisFromSessions(patient, masterKey!);
            if (aiData) {
                setFormData(aiData);
                setIsEditing(true); // Switch to edit mode so user can review
 addToast("Anamnese preenchida com sucesso pela IA! Revise antes de salvar.", "success");
            } else {
 addToast("Não foi possível gerar a anamnese. Verifique sua chave de API.", "error");
            }
        } catch (e) {
 addToast("Erro ao comunicar com a IA.", "error");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const renderField = (field: keyof Anamnesis, label: string, placeholder: string, rows = 4) => {
        if (field === 'lastUpdated') return null;

        return (
            <div className="w-full">
                {isEditing ? (
                    <div className="relative">
                        <Textarea
                            id={`anamnesis-${field}`}
                            label={label}
                            value={formData[field]}
                            onChange={(e) => {
                                if (field === 'diagnosticHypothesis') {
                                    handleDiagnosticChange(e.target.value);
                                } else {
                                    handleChange(field, e.target.value);
                                }
                            }}
                            placeholder={placeholder}
                            rows={rows}
                            className="transition-all duration-200"
                        />
                        {field === 'diagnosticHypothesis' && diagnosticSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-surface border border-border/40 rounded-xl shadow-lg overflow-hidden">
                                <div className="px-3 py-2 bg-surface-container-low text-[10px] font-bold text-foreground-muted uppercase tracking-wider border-b border-border/40">
                                    Sugestões (DSM-5 / CID-11)
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {diagnosticSuggestions.map(s => (
                                        <div 
                                            key={s.code}
                                            className="px-3 py-2 text-sm hover:bg-primary/5 cursor-pointer border-b border-border/20 last:border-0"
                                            onClick={() => applyDiagnosticSuggestion(s)}
                                        >
                                            <span className="font-mono text-primary font-bold mr-2">{s.code}</span>
                                            <span className="text-on-surface">{s.dsm5Label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-border/40 bg-surface-container-lowest p-6 shadow-sm group hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-primary bg-primary/5 px-4 py-1.5 rounded-full ring-1 ring-primary/20">
                                {label}
                            </span>
                        </div>
                        <div className="text-[15px] text-on-surface/80 leading-relaxed whitespace-pre-wrap text-justify px-1">
                            {formData[field] || <span className="text-foreground-muted/40 italic font-medium">Informação pendente de registro...</span>}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn pb-20">
            {/* Header Area - MD3 Clinical */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                        <ClipboardListIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-on-surface tracking-tight">
                                Anamnese Estruturada
                            </h3>
                            <ToolGuideButton toolId="anamnesis" />
                        </div>
                        <p className="text-xs font-semibold text-foreground-muted/60 mt-0.5 uppercase tracking-wider">
                            Última atualização: {formData.lastUpdated ? formatDate(formData.lastUpdated) : 'Não registrada'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {canEdit && !isEditing && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleGenerateWithAI}
                                isLoading={isGeneratingAI}
                                className="!rounded-xl border border-border/60 hover:shadow-sm"
                                title="Preencher campos automaticamente analisando o histórico de sessões"
                            >
                                <SparklesIcon className="mr-2 h-4 w-4 text-primary" />
                                <span className="font-bold text-sm">Preencher com IA</span>
                            </Button>
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="!rounded-xl !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 hover:opacity-90 px-6 py-2 shadow-sm transition-all"
                            >
                                <PencilIcon className="mr-2 h-4 w-4" />
                                <span className="font-bold text-sm">Editar</span>
                            </Button>
                        </>
                    )}
                    {isEditing && (
                        <div className="flex justify-end gap-2 px-1">
                            {isGeneratingAI && (
                                <div className="flex items-center text-primary/70 mr-auto text-sm font-medium">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span>Lendo sessões...</span>
                                </div>
                            )}
                            <Button
                                variant="secondary"
                                onClick={handleCancelAttempt}
                                className="!rounded-xl border border-border/60"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                isLoading={isSaving}
                                className="!rounded-xl !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 hover:opacity-90 px-6 py-2 shadow-sm transition-all"
                            >
                                <CheckCircleIcon className="mr-2 h-4 w-4" />
                                <span className="font-bold text-sm">Salvar Registro</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Unified Clinical Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {renderField('mainComplaint', 'Queixa Principal', 'Descreva o motivo principal da consulta...')}

                {renderField('historyOfPresentIllness', 'História da Moléstia Atual (HMA)', 'Descreva a evolução dos sintomas, início, frequência e intensidade...', 6)}

                {renderField('personalHistory', 'Histórico Pessoal / Desenvolvimento', 'Infância, marcos de desenvolvimento, escolaridade, traumas...')}

                {renderField('familyHistory', 'Histórico Familiar', 'Configuração familiar, histórico de doenças mentais na família...', 5)}

                {renderField('medicalPsychiatricHistory', 'Histórico Médico e Psiquiátrico', 'Doenças prévias, medicações em uso, alergias, tratamentos anteriores...', 5)}

                {renderField('lifestyle', 'Estilo de Vida e Social', 'Sono, alimentação, exercícios, trabalho, lazer, relacionamentos...', 5)}

                {renderField('observation', 'Observações Clínicas Gerais', 'Impressões iniciais, comportamento durante a entrevista, etc...')}

                {renderField('diagnosticHypothesis', 'Hipótese Diagnóstica', 'CID-10, DSM-5 ou hipóteses iniciais...')}

                {renderField('medications', 'Medicamentos em Uso', 'Lista de medicamentos, dosagens e horários...')}
            </div>

            {showExitConfirmation && (
                <DeleteConfirmationModal
                    isOpen={showExitConfirmation}
                    onClose={() => setShowExitConfirmation(false)}
                    onConfirm={handleConfirmCancel}
                    title="Descartar Alterações?"
                    message="Você alterou informações na anamnese. Se cancelar agora, as alterações serão perdidas."
                    confirmLabel="Sim, descartar"
                    cancelLabel="Continuar Editando"
                    variant="danger"
                />
            )}
        </div>
    );
};

export default AnamnesisTab;
