import React, { useEffect, useState, useMemo, useCallback, Fragment, lazy, Suspense } from 'react';
import Modal from '../Modal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Button from '../Button';
import { useSessionEditor } from '@/hooks/useSessionEditor';
import { Session, Patient, Goal, MoodMetrics, JSONContent } from '@/types';
import { Calendar, Clock, DollarSign, CheckCircle, Circle, Save, List, Plus, Check, Mic, ChevronDown, Tag, X, ArrowRight, FileEdit, FileText, Shield, ShieldAlert } from 'lucide-react';
import { usePatientContext } from '@/contexts/PatientContext';
import { generateUUID } from '@/utils/uuid';
import { RichTextEditor } from '@/components/Clinical/RichTextEditor';
import { MoodSlider } from '@/components/Clinical/MoodSlider';
import { useClinicalRecords } from '@/hooks/useClinicalRecords';
import { getPlainTextFromSession } from './RichTextRenderer';
import TranscriptReviewModal from './TranscriptReviewModal';
import { useForensicAudit } from '@/hooks/useForensicAudit';
import DraftReviewView from './DraftReviewView';
import { PracticePrescriptionCard } from './PracticePrescriptionCard';
import type { AudioAnalysisResult } from '@/services/audioService';
import { useToast } from '@/contexts/ToastContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { CopilotWorkspace } from './Copilot/CopilotWorkspace';
import { detectTranscript } from '@/utils/transcriptDetector';
import { EditorEducationProvider, useEditorEducation } from '@/contexts/EditorEducationContext';
import { SessionOnboardingModal } from './Education/SessionOnboardingModal';
import { SessionEditorChecklist } from './Education/SessionEditorChecklist';
import { SessionEditorTour } from './Education/SessionEditorTour';
import { HelpCircle } from 'lucide-react';

// Lazy: SessionRecorder é pesado (media APIs + audioService) — só carrega quando o accordion abre
const SessionRecorder = lazy(() => import('./SessionRecorder'));

interface SessionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: Omit<Session, 'id'> | Session, files: File[], expectedRevision?: number, forceOverride?: boolean) => Promise<any>;
    onFinalize?: (session: Omit<Session, 'id'> | Session, files: File[], expectedRevision: number) => Promise<any>;
    sessionToEdit?: Session | null;
    patient: Patient | null;
}

const SessionEditorModalContent: React.FC<SessionEditorModalProps> = ({
    isOpen, onClose, onSave, onFinalize, sessionToEdit, patient
}) => {
    const { requestHelp, updateChecklist, trackEvent } = useEditorEducation();
    const { formState, setters, lists, status, handlers, draft } = useSessionEditor({
        sessionToEdit, patient, onSave, isOpen
    });

    const { saveGoal } = usePatientContext();
    const { addToast } = useToast();

    const [isAddingGoal, setIsAddingGoal] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState('');

    const [isAddingTag, setIsAddingTag] = useState(false);
    const [isAudioOpen, setIsAudioOpen] = useState(false);

    // Clinical OS State
    const [richContent, setRichContent] = useState<JSONContent | string>('');
    const [finalNotes, setFinalNotes] = useState<JSONContent | string>('');
    const [transcriptText, setTranscriptText] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'evolution' | 'draft' | 'transcript'>('draft');

    // Smart Paste State
    const [showSmartPasteModal, setShowSmartPasteModal] = useState(false);
    const [pastedTextBuffer, setPastedTextBuffer] = useState('');

    const [moods, setMoods] = useState<MoodMetrics>({
        sadness: 0,
        anxiety: 0,
        anger: 0,
        happiness: 0,
        energy: 5
    });

    // Exit Confirmation State
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    // Audio Intelligence State
    const [audioAnalysisResult, setAudioAnalysisResult] = useState<AudioAnalysisResult | null>(null);
    const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
    const [resumoSessao, setResumoSessao] = useState<string | null>(null);
    const [mecanismosEnfrentamento, setMecanismosEnfrentamento] = useState<string | null>(null);

    // Forensic State via Hook
    const { isAuditing, detectedClaims, auditText } = useForensicAudit();

    // Load Content Logic (Dual Read)
    useEffect(() => {
        if (isOpen && sessionToEdit?.id) {
            // Read exclusively from encrypted session object
            setRichContent(sessionToEdit.draft_notes || '');
            setFinalNotes(sessionToEdit.notes || '');
            setTranscriptText(sessionToEdit.transcript || '');
            setResumoSessao(sessionToEdit.resumo_sessao || null);
            setMecanismosEnfrentamento(sessionToEdit.mecanismos_enfrentamento || null);
            if (sessionToEdit.draft_moods) {
                setMoods(sessionToEdit.draft_moods);
            }
            if (sessionToEdit.notes || sessionToEdit.status === 'completed') {
                setActiveTab('evolution');
            } else {
                setActiveTab('draft');
            }
            if (sessionToEdit.transcript) updateChecklist('viewedTranscript');
        } else if (isOpen && !sessionToEdit) {
            // New Session
            setRichContent('');
            setFinalNotes('');
            setTranscriptText('');
            setActiveTab('draft');
            setResumoSessao(null);
            setMecanismosEnfrentamento(null);
            setMoods({ sadness: 0, anxiety: 0, anger: 0, happiness: 0, energy: 5 });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, sessionToEdit?.id]);

    // Verifica se há alterações não salvas (usa richContent local + dados do hook)
    const hasUnsavedChanges = useMemo(() => {
        if (!isOpen) return false;
        const hasContent = typeof richContent === 'string'
            ? richContent.trim().length > 0
            : !!richContent;
        return hasContent || status.hasUnsavedChanges;
    }, [isOpen, richContent, status.hasUnsavedChanges]);

    // Verifica se o rascunho diverge da evolução final
    const hasUnpublishedChanges = useMemo(() => {
        if (!richContent || !finalNotes) return false;
        try {
            return JSON.stringify(richContent) !== JSON.stringify(finalNotes);
        } catch {
            return false;
        }
    }, [richContent, finalNotes]);

    // Atualiza conteúdo do editor (auto-save desabilitado — onSave do pai fecha o modal)
    const handleRichContentChange = useCallback((content: JSONContent | string) => {
        setRichContent(content);
    }, []);

    // UX Defensiva: Reduz a chance de o usuário fechar a aba por acidente (INV-1 complementar)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges || status.sessionOperation === 'conflict') {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        if (isOpen) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, hasUnsavedChanges, status.sessionOperation]);

    const handleCloseAttempt = () => {
        if (status.sessionOperation === 'conflict' || status.sessionOperation === 'save_failed') {
            if (window.confirm("As alterações recentes não foram salvas. Tem certeza que deseja sair e perder o progresso?")) {
                onClose();
            }
            return;
        }
        if (hasUnsavedChanges) {
            setShowExitConfirmation(true);
        } else {
            onClose();
        }
    };

    const handleSaveDraftAndClose = async () => {
        try {
            await handlers.handleSaveDraft(richContent, false, moods, transcriptText);
            onClose();
        } catch (error) {
            // Error is handled inside hook (e.g. conflict)
        }
    };

    const handleConfirmClose = () => {
        setShowExitConfirmation(false);
        onClose();
    };

    const handleSmartPaste = (text: string, event: ClipboardEvent) => {
        if (activeTab === 'draft') {
            const result = detectTranscript(text);
            if (result.isTranscript) {
                trackEvent('smart_paste_triggered');
                setPastedTextBuffer(text);
                setShowSmartPasteModal(true);
                return true; // Intercepts the paste
            }
        }
        return false;
    };

    const handlePublishEvolution = async () => {
        try {
            await handlers.handleSaveDraft(richContent, false, moods, transcriptText);
            setFinalNotes(richContent);
            updateChecklist('publishedEvolution');
            trackEvent('evolution_published');
            addToast("Evolução publicada com sucesso!", "success");
            setActiveTab('evolution');
        } catch (e) {
            console.error("Error publishing evolution", e);
        }
    };

    // Enter review mode (obrigatório antes de finalizar)
    const handleEnterReview = () => {
        const plainText = getPlainTextFromSession(richContent);
        if ((!plainText || plainText.trim().length === 0) && (!transcriptText || transcriptText.trim().length === 0)) {
            addToast("Escreva suas anotações ou inclua uma transcrição antes de finalizar.", "warning");
            return;
        }
        draft.enterReviewMode(richContent);
    };

    const handleFinalize = async () => {
        const success = await handlers.handleFinalize(onFinalize);
        if (success) {
            updateChecklist('finalizedSession');
            trackEvent('session_finalized');
            addToast("Sessão finalizada com sucesso!", "success");
            onClose();
        } else {
            if (status.sessionOperation === 'conflict') {
                addToast("Conflito de versão! Alguém alterou a sessão em outra aba.", "error");
            } else if (Object.keys(status.errors || {}).length > 0) {
                addToast(`Preencha os campos obrigatórios: ${Object.values(status.errors).join(', ')}`, "warning");
            } else {
                addToast("Não foi possível finalizar a sessão. Verifique o console.", "error");
            }
        }
    };

    // Handle audio analysis completion
    const handleAudioAnalysis = (result: AudioAnalysisResult) => {
        setAudioAnalysisResult(result);
        setIsTranscriptModalOpen(true);
    };

    // Save transcript and evolution from audio analysis
    const handleSaveTranscript = (evolution: string, resumo: string, coping: string) => {
        setRichContent(evolution); // Set evolution as rich content
        setResumoSessao(resumo);
        setMecanismosEnfrentamento(coping);
        setIsTranscriptModalOpen(false);
    };

    const handleAuditClaims = async () => {
        if (!patient?.id) return;
        const plainText = getPlainTextFromSession(richContent);
        await auditText(patient.id, plainText);
    };

    const handleQuickAddGoal = async () => {
        if (!newGoalTitle.trim() || !patient) return;
        const newGoal: Goal = {
            id: generateUUID(),
            title: newGoalTitle,
            description: '',
            status: 'in_progress',
            createdAt: new Date().toISOString(),
            interventions: [],
            patientTasks: []
        };
        try {
            await saveGoal(patient.id, newGoal);
            handlers.toggleGoalSelection(newGoal.id);
            setNewGoalTitle('');
            setIsAddingGoal(false);
        } catch (e) {
            console.error("Failed to add quick goal", e);
        }
    };

    const { data: decoupledData } = useDecoupledData(patient?.id, 'clinical_evolution');
    const activeGoals = decoupledData?.goals?.filter((g: Goal) => g.status === 'in_progress') || [];
    const labelClass = "block text-xs font-medium  text-foreground-muted    mb-1.5";
    const baseInputClass = "block w-full rounded-xl px-4  bg-surface  dark:bg-slate-700  text-on-surface     text-foreground-muted  outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border ";
    const inputClass = `${baseInputClass} h-12`;

    // Título dinâmico
    const modalTitle = status.editorMode === 'review'
        ? 'Finalizar Evolução'
        : (sessionToEdit?.status === 'draft' ? 'Continuar Rascunho' : (sessionToEdit ? 'Editar Sessão' : 'Nova Sessão'));

    const modalFooter = status.editorMode === 'review' ? null : (
        <div className="flex flex-col w-full">
            {status.sessionOperation === 'conflict' && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 animate-fadeIn flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                    <div className="flex items-start md:items-center">
                        <ShieldAlert className="w-5 h-5 text-orange-600 mr-3 shrink-0 mt-0.5 md:mt-0" />
                        <div>
                            <p className="text-sm font-semibold text-orange-800">Conflito de Versões</p>
                            <p className="text-xs text-orange-700">Esta sessão foi alterada em outro dispositivo ou aba (Revisão {status.serverRevision}). O que deseja fazer?</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            variant="primary" 
                            className="bg-orange-600 hover:bg-orange-700 text-white border-0 flex-1 md:flex-none text-xs px-3"
                            onClick={() => handlers.handleSaveDraft(richContent, false, moods, transcriptText, true)}
                        >
                            Forçar Sobrescrita (Manter meu rascunho)
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center w-full">
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleSaveDraftAndClose} className="text-foreground-muted" isLoading={status.isSaving}>
                        Salvar e Sair
                    </Button>
                    <Button variant="ghost" onClick={handleAuditClaims} isLoading={isAuditing} className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Auditar IA
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="tour-step-publish" variant="secondary" onClick={handlePublishEvolution} isLoading={status.sessionOperation === 'saving_draft'}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Publicar no Prontuário
                    </Button>
                    <Button onClick={handleEnterReview} className="tour-step-finalize !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-md">
                        Finalizar Sessão
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <Fragment>
            <Modal isOpen={isOpen} onClose={handleCloseAttempt} title={modalTitle} size="xl" footer={modalFooter}>

                {/* Review Mode */}
                {status.editorMode === 'review' ? (
                    <DraftReviewView
                        reviewText={draft.reviewText}
                        onReviewTextChange={draft.setReviewText}
                        onBack={draft.exitReviewMode}
                        onFinalize={handleFinalize}
                        isSaving={status.isSaving}
                        patientName={patient?.name}
                        transcript={transcriptText}
                    />
                ) : (

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
                    {/* Left Column: Editor & Moods (8 cols) */}
                    <div className="md:col-span-8 flex flex-col h-full space-y-4">
                        {/* Mood Tracking Section */}
                        <div className=" bg-surface p-4 rounded-2xl border border-border/60 shadow-sm animate-fadeIn">
                            <h4 className="text-sm font-semibold text-foreground-muted mb-3 flex items-center">
                                <Circle className="w-3 h-3 mr-2 bg-purple-500 rounded-full text-purple-500" />
                                Monitoramento de Humor
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <MoodSlider
                                    label="Tristeza"
                                    value={moods.sadness || 0}
                                    onChange={(v) => setMoods(prev => ({ ...prev, sadness: v }))}
                                    color="text-blue-500"
                                />
                                <MoodSlider
                                    label="Ansiedade"
                                    value={moods.anxiety || 0}
                                    onChange={(v) => setMoods(prev => ({ ...prev, anxiety: v }))}
                                    color="text-purple-500"
                                />
                                <MoodSlider
                                    label="Raiva"
                                    value={moods.anger || 0}
                                    onChange={(v) => setMoods(prev => ({ ...prev, anger: v }))}
                                    color="text-red-500"
                                />
                                <MoodSlider
                                    label="Felicidade"
                                    value={moods.happiness || 0}
                                    onChange={(v) => setMoods(prev => ({ ...prev, happiness: v }))}
                                    color="text-yellow-500"
                                />
                                <MoodSlider
                                    label="Energia"
                                    value={moods.energy || 0}
                                    onChange={(v) => setMoods(prev => ({ ...prev, energy: v }))}
                                    color="text-green-500"
                                />
                            </div>
                        </div>

                        {/* Editor Tabs */}
                        <div className="flex-1 flex flex-col rounded-2xl border border-border/60 bg-surface shadow-sm overflow-hidden">
                            {/* Tabs Header */}
                            <div className="flex justify-between items-center border-b border-border/60 bg-slate-50 dark:bg-slate-800/50 pr-4">
                                <div className="flex w-full">
                                    <button
                                        type="button"
                                        className={`tour-step-evolution flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'evolution' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        onClick={() => setActiveTab('evolution')}
                                    >
                                        📄 Evolução Final
                                    </button>
                                    <button
                                        type="button"
                                        className={`tour-step-draft flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'draft' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        onClick={() => setActiveTab('draft')}
                                    >
                                        📝 Rascunho
                                        {hasUnpublishedChanges && (
                                            <span className="ml-2 w-2 h-2 rounded-full bg-orange-400" title="Alterações não publicadas"></span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className={`tour-step-transcript flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'transcript' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        onClick={() => {
                                            setActiveTab('transcript');
                                            updateChecklist('viewedTranscript');
                                        }}
                                    >
                                        🎙 Transcrição
                                    </button>
                                </div>
                                <button
                                    onClick={requestHelp}
                                    className="hidden md:flex ml-4 items-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-md flex-shrink-0"
                                    title="Aprender o Fluxo"
                                >
                                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                                    Guia
                                </button>
                            </div>

                            {/* Tabs Content */}
                            <div className="flex-1 overflow-y-auto relative">
                                {activeTab === 'evolution' && (
                                    <>
                                        {(!finalNotes || finalNotes === '') ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50">
                                                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhuma evolução publicada</h3>
                                                <p className="text-sm text-foreground-muted max-w-sm mb-6">
                                                    Próximo passo:<br/>
                                                    1. Escreva um rascunho<br/>
                                                    2. Clique em Publicar<br/>
                                                    3. Finalize a sessão
                                                </p>
                                                <Button onClick={() => setActiveTab('draft')}>
                                                    Ir para o Rascunho
                                                </Button>
                                            </div>
                                        ) : (
                                            <RichTextEditor
                                                content={finalNotes}
                                                onChange={setFinalNotes}
                                                isAuditing={isAuditing}
                                                detectedClaims={detectedClaims}
                                                placeholder="Prontuário oficial vazio."
                                                className="h-full border-0 rounded-none shadow-none"
                                            />
                                        )}
                                    </>
                                )}
                                {activeTab === 'draft' && (
                                    <div className="flex flex-col h-full">
                                        {(!richContent || richContent === '') ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50">
                                                <FileEdit className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Seu espaço de trabalho</h3>
                                                {transcriptText ? (
                                                    <p className="text-sm text-foreground-muted max-w-sm mb-6">
                                                        Você já possui uma transcrição desta sessão.
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-foreground-muted max-w-sm mb-6">
                                                        1. Adicione a transcrição ou escreva manualmente.<br/>
                                                        2. Publique no prontuário.
                                                    </p>
                                                )}
                                                <div className="flex gap-3">
                                                    {transcriptText && (
                                                        <Button variant="primary">
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Gerar a partir da Transcrição
                                                        </Button>
                                                    )}
                                                    <Button variant="secondary" onClick={() => {
                                                        setRichContent('<p></p>');
                                                        updateChecklist('createdDraft');
                                                    }}>
                                                        Começar a escrever
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <RichTextEditor
                                                    content={richContent}
                                                    onChange={(c) => {
                                                        handleRichContentChange(c);
                                                        updateChecklist('createdDraft');
                                                    }}
                                                    isAuditing={isAuditing}
                                                    detectedClaims={detectedClaims}
                                                    placeholder="Escreva livremente durante a sessão — seu rascunho será salvo automaticamente..."
                                                    className="flex-1 border-0 rounded-none shadow-none"
                                                    onPaste={handleSmartPaste}
                                                />
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-border/60 p-2 text-center">
                                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                                        💡 Dica: O Copilot produz resultados melhores quando a transcrição bruta fica na aba Transcrição e a evolução clínica final é montada aqui.
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'transcript' && (
                                    <div className="p-4 h-full relative flex flex-col">
                                        {(!transcriptText || transcriptText === '') && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50 pointer-events-none">
                                                <Mic className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhuma transcrição disponível</h3>
                                                <p className="text-sm text-foreground-muted max-w-sm mb-6">
                                                    Grave uma sessão ou cole aqui o texto bruto da conversa (ex: gerado pelo Gemini).
                                                </p>
                                            </div>
                                        )}
                                        <textarea
                                            className="w-full h-full min-h-[300px] resize-none border-0 bg-transparent focus:ring-0 text-slate-800 dark:text-slate-200 outline-none p-2 relative z-10"
                                            placeholder=""
                                            value={transcriptText}
                                            onChange={(e) => {
                                                setTranscriptText(e.target.value);
                                                updateChecklist('viewedTranscript');
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audio Intelligence Section (Accordion) */}
                        <div className="mt-4 bg-surface rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col transition-all duration-300">
                            <button
                                type="button"
                                onClick={() => setIsAudioOpen(!isAudioOpen)}
                                className="w-full p-4 flex items-center justify-between bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
                            >
                                <div className="flex items-center">
                                    <Mic className="w-4 h-4 mr-2 text-blue-500" />
                                    <h4 className="text-sm font-semibold text-foreground-muted">Inteligência de Áudio</h4>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform duration-300 ${isAudioOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isAudioOpen && (
                                <div className="p-4 pt-0 animate-fadeIn">
                                    <Suspense fallback={
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                    }>
                                        <SessionRecorder
                                            onAnalysisComplete={handleAudioAnalysis}
                                            sessionContext={patient ? `Paciente: ${patient.name}` : undefined}
                                        />
                                    </Suspense>
                                </div>
                            )}
                        </div>

                        {/* Copilot Clinical Workspace (Painel de Exploração) */}
                        <CopilotWorkspace editorContent={richContent} />
                    </div>

                    {/* Right Column: Sidebar (4 cols) */}
                    <div className="md:col-span-4 space-y-6">
                        <div className=" bg-surface p-4 rounded-2xl border border-border/60 space-y-4">
                            <h4 className="font-semibold text-on-surface flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-foreground-muted " />
                                Detalhes da Sessão
                            </h4>

                            <div>
                                <label className={labelClass}>Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    value={formState.sessionDate}
                                    onChange={(e) => setters.setSessionDate(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Duração (min)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formState.duration}
                                            onChange={(e) => setters.setDuration(Number(e.target.value))}
                                            className={inputClass}
                                        />
                                        <Clock className="absolute right-3 top-2.5 w-4 h-4 text-foreground-muted " />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Valor</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formState.price}
                                            onChange={(e) => setters.setPrice(Number(e.target.value))}
                                            className={inputClass}
                                        />
                                        <DollarSign className="absolute right-3 top-2.5 w-4 h-4 text-foreground-muted " />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Status Financeiro</label>
                                <div className="grid grid-cols-2 gap-2 bg-background dark:bg-slate-700 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setters.setPaymentStatus('pending')}
                                        className={`flex items-center justify-center py-1.5 text-sm font-medium rounded ${formState.paymentStatus === 'pending' ? ' bg-surface  dark:bg-slate-600  text-on-surface    shadow-sm' : ' text-foreground-muted    hover:text-slate-800'}`}
                                    >
                                        <Circle className="w-3.5 h-3.5 mr-1.5" />
                                        Pendente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setters.setPaymentStatus('paid')}
                                        className={`flex items-center justify-center py-1.5 text-sm font-medium rounded ${formState.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shadow-sm ring-1 ring-green-200 dark:ring-green-800' : ' text-foreground-muted    hover:text-slate-800'}`}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                        Pago
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className=" bg-surface p-4 rounded-2xl border border-border/60 overflow-hidden flex flex-col max-h-60">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-on-surface flex items-center text-sm">
                                    <List className="w-4 h-4 mr-2 text-foreground-muted " />
                                    Metas Trabalhadas
                                </h4>
                                {!isAddingGoal ? (
                                    <button
                                        onClick={() => setIsAddingGoal(true)}
                                        className="text-xs flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Nova Meta
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingGoal(false)}
                                        className="text-xs text-foreground-muted hover:text-slate-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            {isAddingGoal && (
                                <div className="mb-3 flex items-center gap-2 animate-fadeIn">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Título da meta..."
                                        className={`${inputClass} !py-1 !text-xs`}
                                        value={newGoalTitle}
                                        onChange={(e) => setNewGoalTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAddGoal()}
                                    />
                                    <button
                                        onClick={handleQuickAddGoal}
                                        disabled={!newGoalTitle.trim()}
                                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <div className="overflow-y-auto flex-1 -mx-2 px-2">
                                {activeGoals.length === 0 ? (
                                    <p className="text-xs text-foreground-muted italic text-center py-4">
                                        Nenhuma meta ativa.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {activeGoals.map((goal: Goal) => {
                                            const isSelected = lists.selectedGoalIds.includes(goal.id);
                                            return (
                                                <label key={goal.id} className={`flex items-start p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handlers.toggleGoalSelection(goal.id)}
                                                        className="mt-0.5 w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500 dark:bg-slate-700 "
                                                    />
                                                    <span className={`ml-2 text-sm block font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ' text-foreground-muted   '}`}>
                                                        {goal.title}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags Clínicas */}
                        <div className=" bg-surface p-4 rounded-2xl border border-border/60 overflow-hidden flex flex-col max-h-60">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-on-surface flex items-center text-sm">
                                    <Tag className="w-4 h-4 mr-2 text-foreground-muted " />
                                    Tags Clínicas
                                </h4>
                                {!isAddingTag ? (
                                    <button
                                        onClick={() => setIsAddingTag(true)}
                                        className="text-xs flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Nova Tag
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingTag(false)}
                                        className="text-xs text-foreground-muted hover:text-slate-600"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>

                            {isAddingTag && (
                                <div className="mb-3 flex items-center gap-2 animate-fadeIn">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Nome da tag..."
                                        className={`${inputClass} !py-1 !text-xs`}
                                        value={formState.newTagInput}
                                        onChange={(e) => setters.setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handlers.handleAddTag();
                                                setIsAddingTag(false);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            handlers.handleAddTag();
                                            setIsAddingTag(false);
                                        }}
                                        disabled={!formState.newTagInput.trim()}
                                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <div className="overflow-y-auto flex-1 -mx-2 px-2">
                                {lists.currentTags.length === 0 ? (
                                    <p className="text-xs text-foreground-muted italic text-center py-4">
                                        Nenhuma tag adicionada.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {lists.currentTags.map(tag => (
                                            <div
                                                key={tag.id}
                                                className="group flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                                            >
                                                <span>{tag.text}</span>
                                                <button
                                                    onClick={() => handlers.handleRemoveTag(tag.id)}
                                                    className="ml-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all focus:opacity-100"
                                                    title="Remover tag"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Clinical Intelligence Blocks (AI) */}
                        {(resumoSessao || mecanismosEnfrentamento) && (
                            <div className="space-y-4 animate-fadeIn">
                                {resumoSessao && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-800">
                                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center text-sm mb-2">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Resumo da Sessão (IA)
                                        </h4>
                                        <p className="text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap leading-relaxed">
                                            {resumoSessao}
                                        </p>
                                    </div>
                                )}

                                {mecanismosEnfrentamento && (
                                    <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100/60 dark:border-teal-800">
                                        <h4 className="font-semibold text-teal-900 dark:text-teal-100 flex items-center text-sm mb-2">
                                            <Shield className="w-4 h-4 mr-2" />
                                            Mecanismos de Enfrentamento
                                        </h4>
                                        <p className="text-sm text-teal-800 dark:text-teal-200 whitespace-pre-wrap leading-relaxed">
                                            {mecanismosEnfrentamento}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Practice Prescription (Phase 21) */}
                        {patient && (
                            <PracticePrescriptionCard
                                patientId={patient.id}
                                patientName={patient.name}
                                sessionId={sessionToEdit?.id}
                                selectedGoalIds={lists.selectedGoalIds}
                            />
                        )}

                    </div>
                </div>
                )}
            </Modal>

            {/* Transcript Review Modal */}
            {showExitConfirmation && (
                <DeleteConfirmationModal
                    isOpen={showExitConfirmation}
                    onClose={() => setShowExitConfirmation(false)}
                    onConfirm={handleConfirmClose}
                    title="Descartar Alterações?"
                    message="Você tem dados não salvos nesta sessão. Se sair agora, todo o progresso será perdido."
                    confirmLabel="Sim, descartar"
                    cancelLabel="Continuar Editando"
                    variant="danger"
                />
            )}

            {audioAnalysisResult && (
                <TranscriptReviewModal
                    isOpen={isTranscriptModalOpen}
                    onClose={() => setIsTranscriptModalOpen(false)}
                    analysisResult={audioAnalysisResult}
                    onSave={handleSaveTranscript}
                />
            )}

            {showSmartPasteModal && (
                <Modal isOpen={showSmartPasteModal} onClose={() => setShowSmartPasteModal(false)} title="Possível Transcrição Detectada">
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-foreground-muted">
                            Detectamos que o texto colado parece ser uma transcrição bruta da sessão (muitos turnos de fala e formato longo).
                            O rascunho clínico geralmente contém apenas os pontos principais.
                        </p>
                        <div className="flex flex-col gap-3 mt-4">
                            <Button
                                onClick={() => {
                                    trackEvent('smart_paste_moved_to_transcript');
                                    setTranscriptText(transcriptText ? transcriptText + '\n\n' + pastedTextBuffer : pastedTextBuffer);
                                    setActiveTab('transcript');
                                    setShowSmartPasteModal(false);
                                    setPastedTextBuffer('');
                                }}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Mover para a aba de Transcrição
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    trackEvent('smart_paste_kept_in_draft');
                                    const textNodes = pastedTextBuffer.split('\n').map(p => `<p>${p}</p>`).join('');
                                    setRichContent(typeof richContent === 'string' ? richContent + textNodes : richContent);
                                    setShowSmartPasteModal(false);
                                    setPastedTextBuffer('');
                                }}
                            >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Inserir no Rascunho
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    trackEvent('smart_paste_cancelled');
                                    setShowSmartPasteModal(false);
                                    setPastedTextBuffer('');
                                }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar Colagem
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </Fragment>
    );
};

const SessionEditorModal: React.FC<SessionEditorModalProps> = (props) => {
    return (
        <EditorEducationProvider>
            <SessionEditorModalContent {...props} />
            <SessionOnboardingModal />
            <SessionEditorChecklist />
            <SessionEditorTour />
        </EditorEducationProvider>
    );
};

export default SessionEditorModal;
