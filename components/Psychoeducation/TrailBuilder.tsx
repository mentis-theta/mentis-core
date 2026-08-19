import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTrails } from '@/hooks/useTrails';
import Button from '@/components/Button';
import {
    PlusIcon,
    TrashIcon,
    BookOpenIcon,
    DocumentTextIcon,
    VideoCameraIcon,
    ChatBubbleLeftRightIcon,
    ArrowLeftIcon,
    SaveIcon,
    PencilIcon,
    ClipboardListIcon,
    MinusCircleIcon,
    LinkIcon,
    BeakerIcon,
    ChartBarIcon
} from '@/components/Icons';
import { Trail, TrailStep, StepContentType } from '@/types';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Zap, Info } from 'lucide-react';

interface TrailBuilderProps {
    initialTrail: Trail | null; // Null means creating a new trail
    onClose: () => void;
    trailType?: 'psychoeducation' | 'practice';
}

export const TrailBuilder: React.FC<TrailBuilderProps> = ({ initialTrail, onClose, trailType = 'psychoeducation' }) => {
    const {
        createTrail,
        updateTrail,
        createModule,
        deleteModule,
        createStep,
        deleteStep,
        updateStep,
        refresh,
        getTrailById
    } = useTrails();
    const confirm = useConfirm();

    const [editingTrail, setEditingTrail] = useState<Trail | null>(initialTrail);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [activeStep, setActiveStep] = useState<TrailStep | null>(null);

    // Draft State for New Trail
    const [draftTitle, setDraftTitle] = useState('');
    const [draftDescription, setDraftDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showTips, setShowTips] = useState(true);

    // Initializer
    useEffect(() => {
        setMounted(true);
        if (initialTrail) {
            setEditingTrail(initialTrail);
            setDraftTitle(initialTrail.title);
            setDraftDescription(initialTrail.description || '');
            if (trailType === 'practice' && initialTrail.modules && initialTrail.modules.length > 0) {
                setActiveModuleId(initialTrail.modules[0].id);
                if (initialTrail.modules[0].steps && initialTrail.modules[0].steps.length > 0) {
                    setActiveStep(initialTrail.modules[0].steps[0]);
                }
            }
        }
    }, [initialTrail, trailType]);

    // Control tips auto-expansion based on view counts
    useEffect(() => {
        if (trailType === 'practice' && !editingTrail && mounted) {
            const viewsStr = localStorage.getItem('mentis_task_tips_views') || '0';
            const views = parseInt(viewsStr, 10);
            if (views >= 3) {
                setShowTips(false);
            } else {
                setShowTips(true);
                localStorage.setItem('mentis_task_tips_views', String(views + 1));
            }
        }
    }, [editingTrail, trailType, mounted]);

    const handleCreateInitialTrail = async () => {
        if (!draftTitle.trim()) return;
        setIsSubmitting(true);
        const newTrail = await createTrail(draftTitle, draftDescription, trailType);
        if (newTrail) {
            if (trailType === 'practice') {
                const mod = await createModule(newTrail.id, 'Tarefa Principal');
                if (mod) {
                    setActiveModuleId(mod.id);
                    const updated = await getTrailById(newTrail.id);
                    if (updated) setEditingTrail(updated);
                } else {
                    setEditingTrail(newTrail);
                }
            } else {
                setEditingTrail(newTrail);
            }
            refresh();
        }
        setIsSubmitting(false);
    };

    const handleUpdateTrailDetails = async () => {
        if (!editingTrail) return;
        await updateTrail(editingTrail.id, {
            title: draftTitle,
            description: draftDescription
        });
    };

    const handleCreateModule = async () => {
        if (!editingTrail) return;
        const title = await confirm({
            title: trailType === 'practice' ? "Novo Bloco" : "Novo Módulo",
            message: trailType === 'practice' ? "Digite o nome do novo bloco da atividade:" : "Digite o nome do novo módulo:",
            confirmText: "Criar",
            requireInput: true,
            inputPlaceholder: trailType === 'practice' ? "Nome do Bloco" : "Nome do Módulo"
        });
        if (typeof title === 'string' && title.trim()) {
            await createModule(editingTrail.id, title.trim());
            refresh(); // Updates global trails list

            // Update local editing state for immediate UI refresh
            const updated = await getTrailById(editingTrail.id);
            if (updated) setEditingTrail(updated);
        }
    };

    const handleCreateStep = async (type: StepContentType) => {
        if (!activeModuleId) return;
        const activeModule = editingTrail?.modules.find(m => m.id === activeModuleId);
        if (!activeModule) return;

        let finalTitle = "";
        if (trailType === 'practice') {
            const defaults: Record<string, string> = {
                'tool_redirect': 'Ferramenta Interativa',
                'behavioral_experiment': 'Experimento Comportamental',
                'self_monitoring': 'Auto-Monitoramento',
                'free_response': 'Reflexão Livre'
            };
            finalTitle = defaults[type] || 'Nova Tarefa';
        } else {
            const title = await confirm({
                title: "Nova Lição",
                message: "Digite o título da lição:",
                confirmText: "Criar",
                requireInput: true,
                inputPlaceholder: "Título da Lição"
            });
            if (typeof title === 'string' && title.trim()) {
                finalTitle = title.trim();
            }
        }

        if (finalTitle) {
            const newStep = await createStep(activeModuleId, finalTitle, type);
            
            // Otimização: Atualização otimista local para evitar lentidão extrema de requisições pesadas
            if (newStep && editingTrail) {
                setEditingTrail(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        modules: prev.modules.map(m => m.id === activeModuleId ? {
                            ...m,
                            steps: [...(m.steps || []), newStep]
                        } : m)
                    };
                });
                
                if (trailType === 'practice') {
                    setActiveStep(newStep);
                }
            }
        }
    };

    const handleDeleteStep = async (stepId: string) => {
        // Atualização otimista
        if (editingTrail) {
            setEditingTrail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    modules: prev.modules.map(m => ({
                        ...m,
                        steps: m.steps?.filter(s => s.id !== stepId) || []
                    }))
                };
            });
            if (activeStep?.id === stepId) setActiveStep(null);
        }
        await deleteStep(stepId);
    };

    const handleDeleteModule = async (moduleId: string) => {
        // Atualização otimista
        if (editingTrail) {
            setEditingTrail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    modules: prev.modules.filter(m => m.id !== moduleId)
                };
            });
            if (activeModuleId === moduleId) setActiveModuleId(null);
            if (activeStep) setActiveStep(null);
        }
        await deleteModule(moduleId);
    };

    const handleSaveStepContent = async () => {
        if (!editingTrail || !activeModuleId || !activeStep) return;

        // Atualização otimista local
        setEditingTrail(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                modules: prev.modules.map(m => m.id === activeModuleId ? {
                    ...m,
                    steps: m.steps?.map(s => s.id === activeStep.id ? activeStep : s) || []
                } : m)
            };
        });
        
        await updateStep(activeStep.id, {
            content_data: activeStep.content_data,
            title: activeStep.title
        });
        
        setActiveStep(null); // Close editor
    };

    if (!mounted) return null;

    // If we are in "Create Mode" and haven't created the trail yet
    if (!editingTrail) {
        return createPortal(
            <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-surface-container-lowest rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-border/40">
                    <div className="p-6 border-b border-border/40 flex justify-between items-center bg-surface-container-low">
                        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                            <PlusIcon className="h-6 w-6 text-primary" />
                            {trailType === 'practice' ? 'Nova Tarefa Clínica' : 'Nova Trilha'}
                        </h2>
                        <button onClick={onClose} className="text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none">
                            ✕
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {trailType === 'practice' && (
                            <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-2xl border border-violet-100 dark:border-violet-800/40 animate-fadeIn space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm font-bold text-violet-800 dark:text-violet-200">
                                        <Zap className="h-4 w-4 text-violet-500 flex-shrink-0" />
                                        <span>Dica Clínica: O que são Tarefas?</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setShowTips(!showTips)}
                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200 transition-colors cursor-pointer outline-none"
                                    >
                                        {showTips ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                                {showTips && (
                                    <p className="leading-relaxed text-sm text-violet-700 dark:text-violet-300 animate-fadeIn">
                                        As tarefas são ferramentas interativas que o paciente utiliza entre as sessões para consolidar o aprendizado e monitorar sintomas. No próximo passo, você poderá combinar blocos de instrução, escalas de intensidade e campos de escrita reflexiva para criar uma intervenção personalizada.
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {trailType === 'practice' ? 'Nome da Tarefa' : 'Nome da Trilha'}
                            </label>
                            <input
                                type="text"
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                placeholder={trailType === 'practice' ? 'Ex: Rastreador de Prazer Diário' : 'Ex: Higiene do Sono'}
                                className="w-full p-3 border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {trailType === 'practice' ? 'Objetivo Clínico (Uso Interno)' : 'Descrição'}
                            </label>
                            <textarea
                                value={draftDescription}
                                onChange={(e) => setDraftDescription(e.target.value)}
                                placeholder={trailType === 'practice' ? 'Qual a intenção terapêutica desta tarefa?' : 'Sobre o que é esta trilha?'}
                                className="w-full p-3 border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary h-24 resize-none outline-none"
                            />
                            {trailType === 'practice' && (
                                <p className="text-[11px] text-foreground-muted mt-2 flex items-center gap-1.5 font-medium">
                                    <Info className="h-3.5 w-3.5 text-sky-500" /> 
                                    O paciente não verá este objetivo. Ele serve apenas para organizar sua biblioteca.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-border/40">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleCreateInitialTrail} disabled={!draftTitle.trim() || isSubmitting}>
                            {isSubmitting ? 'Criando...' : (trailType === 'practice' ? 'Construir Fluxo' : 'Começar a Construir')}
                        </Button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // EDITOR LAYOUT
    const activeModule = editingTrail.modules?.find(m => m.id === activeModuleId);

    return createPortal(
        <div className="fixed inset-0 z-[999] bg-canvas flex flex-col animate-fadeIn">
            {/* Header */}
            <header className="h-[72px] bg-canvas border-b border-border/40 flex items-center justify-between px-8 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-foreground-muted transition-colors"
                        title="Voltar para Biblioteca"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onBlur={handleUpdateTrailDetails}
                            className="font-bold text-on-surface bg-transparent border-none p-0 focus:ring-0 text-lg outline-none"
                        />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted flex items-center gap-1">
                            <SaveIcon className="h-3 w-3" /> Salvamento automático
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose} className="!rounded-full px-6 font-bold hover:bg-surface-container-low transition-all">
                        Concluir Edição
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar: Modules */}
                {trailType !== 'practice' && (
                    <aside className="w-80 bg-canvas border-r border-border/40 flex flex-col overflow-y-auto">
                        <div className="p-5 border-b border-border/40 flex justify-between items-center bg-canvas">
                            <h3 className="font-bold text-[10px] uppercase text-foreground-muted tracking-[0.15em]">Estrutura</h3>
                            <button
                                onClick={handleCreateModule}
                                className="text-primary hover:bg-primary/5 px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold outline-none"
                            >
                                <PlusIcon className="h-4 w-4" /> MÓDULO
                            </button>
                        </div>

                        <div className="flex-1 p-2 space-y-2">
                            {(editingTrail.modules || []).length === 0 && (
                                <div className="text-center py-12 text-foreground-muted text-sm px-6">
                                    <p className="mb-2">Nenhum módulo ainda.</p>
                                    <Button size="sm" variant="ghost" onClick={handleCreateModule}>Criar Módulo</Button>
                                </div>
                            )}

                            {editingTrail.modules?.map((mod, idx) => (
                                <div key={mod.id} className="space-y-1">
                                    <div
                                        onClick={() => {
                                            setActiveModuleId(mod.id);
                                            setActiveStep(null);
                                        }}
                                        className={`
                                            group flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all mx-2
                                            ${activeModuleId === mod.id
                                                ? 'bg-surface-container-lowest border-primary/20 shadow-sm'
                                                : 'bg-transparent border-transparent hover:bg-surface-container-low hover:text-on-surface'}
                                        `}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-bold truncate ${activeModuleId === mod.id ? 'text-primary' : 'text-foreground-muted'}`}>
                                                Módulo {idx + 1}: {mod.title}
                                            </div>
                                            <div className="text-[10px] font-bold text-foreground-muted/60 uppercase tracking-wide mt-0.5">
                                                {(mod.steps || []).length} lições
                                            </div>
                                        </div>
                                        {activeModuleId === mod.id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }}
                                                className=" text-foreground-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                )}

                {/* Main Content Area */}
                <section className="flex-1 flex bg-canvas overflow-hidden relative">
                    {activeModuleId && activeModule ? (
                        <>
                            {/* Steps List (Middle) */}
                            <div className={`flex-1 overflow-y-auto p-8 ${activeStep ? 'hidden md:block md:w-1/2 lg:w-2/5 border-r border-border/40' : 'w-full'} scrollbar-thin`}>
                                {trailType === 'practice' ? (
                                    <>
                                        <header className="mb-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <span className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-[0.2em] bg-fuchsia-50 px-2 py-1 rounded-md">Tarefa</span>
                                                    <h2 className="text-3xl font-bold text-on-surface mt-3 tracking-tight">Blocos da Tarefa</h2>
                                                </div>
                                            </div>
                                            <p className="text-foreground-muted text-sm font-medium">
                                                Construa a sequência de intervenção (Regulação, Descarga, Reflexão).
                                            </p>
                                        </header>

                                        <div className="space-y-3 mb-10">
                                            {(activeModule.steps || []).length === 0 && (
                                                <div className="border-2 border-dashed border-border/40 rounded-3xl p-16 text-center text-foreground-muted bg-surface-container-lowest/50">
                                                    <BeakerIcon className="h-12 w-12 mx-auto mb-4 opacity-20 text-fuchsia-600" />
                                                    <p className="font-bold text-on-surface">O fluxo está vazio.</p>
                                                    <p className="text-sm mt-1">Adicione a primeira ferramenta abaixo.</p>
                                                </div>
                                            )}

                                            {activeModule.steps?.map((step, idx) => (
                                                <div
                                                    key={step.id}
                                                    onClick={() => setActiveStep(step)}
                                                    className={`
                                                        p-5 rounded-2xl border cursor-pointer flex items-center justify-between group transition-all
                                                        ${activeStep?.id === step.id
                                                            ? 'bg-fuchsia-50 border-fuchsia-300 shadow-md ring-1 ring-fuchsia-500/20'
                                                            : 'bg-surface-container-lowest border-border/40 hover:border-fuchsia-300 hover:shadow-sm'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-10 w-10 rounded-xl bg-canvas border border-border/40 flex items-center justify-center text-on-surface font-bold text-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-bold transition-colors ${activeStep?.id === step.id ? 'text-fuchsia-700' : 'text-on-surface'}`}>{step.title}</h4>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted/60">
                                                                {step.content_type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                                        className="p-2.5 text-foreground-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 outline-none cursor-pointer"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tool Grid (only if no tool_redirect exists) */}
                                        {!activeModule.steps?.some(s => s.content_type === 'tool_redirect') && (
                                            <div className="border-t border-border/40 pt-8 mt-8">
                                                <h3 className="text-sm font-bold text-on-surface mb-4">Adicionar Novo Bloco</h3>
                                                <div className="grid grid-cols-1 gap-3 text-left">
                                                    {(activeModule.steps || []).length === 0 && (
                                                        <button onClick={() => handleCreateStep('tool_redirect')} className="p-4 bg-surface-container-lowest border border-border/40 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 hover:shadow-md rounded-2xl transition-all outline-none cursor-pointer group flex items-center gap-4">
                                                            <div className="bg-fuchsia-50 text-fuchsia-600 p-3 rounded-xl"><LinkIcon className="h-5 w-5" /></div>
                                                            <div>
                                                                <h3 className="font-bold text-sm text-on-surface">Ferramenta Interativa</h3>
                                                                <p className="text-[11px] text-foreground-muted">Apenas envio único (RPD, Respiração). Não pode ser empilhado.</p>
                                                            </div>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleCreateStep('text')} className="p-4 bg-surface-container-lowest border border-border/40 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md rounded-2xl transition-all outline-none cursor-pointer group flex items-center gap-4">
                                                        <div className="bg-slate-50 text-slate-600 p-3 rounded-xl"><DocumentTextIcon className="h-5 w-5" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm text-on-surface">Texto Base / Instrução</h3>
                                                            <p className="text-[11px] text-foreground-muted">Regulação e instrução antes da atividade.</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleCreateStep('self_monitoring')} className="p-4 bg-surface-container-lowest border border-border/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md rounded-2xl transition-all outline-none cursor-pointer group flex items-center gap-4">
                                                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl"><ChartBarIcon className="h-5 w-5" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm text-on-surface">Auto-Monitoramento (Barra)</h3>
                                                            <p className="text-[11px] text-foreground-muted">Mede intensidade de emoções (0-10).</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleCreateStep('behavioral_experiment')} className="p-4 bg-surface-container-lowest border border-border/40 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md rounded-2xl transition-all outline-none cursor-pointer group flex items-center gap-4">
                                                        <div className="bg-violet-50 text-violet-600 p-3 rounded-xl"><BeakerIcon className="h-5 w-5" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm text-on-surface">Experimento Comportamental</h3>
                                                            <p className="text-[11px] text-foreground-muted">Predição, Ação e Aprendizado.</p>
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleCreateStep('free_response')} className="p-4 bg-surface-container-lowest border border-border/40 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md rounded-2xl transition-all outline-none cursor-pointer group flex items-center gap-4">
                                                        <div className="bg-sky-50 text-sky-600 p-3 rounded-xl"><ChatBubbleLeftRightIcon className="h-5 w-5" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-sm text-on-surface">Reflexão Livre (Fórmula)</h3>
                                                            <p className="text-[11px] text-foreground-muted">Texto livre com placeholder programável.</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <header className="mb-8">
                                            <div className="flex justify-between items-start mb-10">
                                                <div>
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-1 rounded-md">Módulo</span>
                                                    <h2 className="text-3xl font-bold text-on-surface mt-3 tracking-tight">{activeModule.title}</h2>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleCreateStep('text')}
                                                        className="p-3 bg-surface-container-lowest border border-border/40 rounded-xl hover:border-primary/40 hover:text-primary transition-all shadow-sm group outline-none cursor-pointer"
                                                        title="Adicionar Texto"
                                                    >
                                                        <DocumentTextIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCreateStep('video')}
                                                        className="p-3 bg-surface-container-lowest border border-border/40 rounded-xl hover:border-primary/40 hover:text-primary transition-all shadow-sm group outline-none cursor-pointer"
                                                        title="Adicionar Vídeo"
                                                    >
                                                        <VideoCameraIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCreateStep('reflection')}
                                                        className="p-3 bg-surface-container-lowest border border-border/40 rounded-xl hover:border-primary/40 hover:text-primary transition-all shadow-sm group outline-none cursor-pointer"
                                                        title="Adicionar Reflexão"
                                                    >
                                                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCreateStep('checklist')}
                                                        className="p-3 bg-surface-container-lowest border border-border/40 rounded-xl hover:border-primary/40 hover:text-primary transition-all shadow-sm group outline-none cursor-pointer"
                                                        title="Adicionar Checklist"
                                                    >
                                                        <ClipboardListIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-foreground-muted text-sm font-medium">
                                                Contrua a experiência de aprendizagem passo a passo.
                                            </p>
                                        </header>

                                        <div className="space-y-3">
                                            {(activeModule.steps || []).length === 0 && (
                                                <div className="border-2 border-dashed border-border/40 rounded-3xl p-16 text-center text-foreground-muted bg-surface-container-lowest/50">
                                                    <BookOpenIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                    <p className="font-bold text-on-surface">Este módulo está vazio.</p>
                                                    <p className="text-sm mt-1">Use os botões acima para adicionar sua primeira lição.</p>
                                                </div>
                                            )}

                                            {activeModule.steps?.map((step, idx) => (
                                                <div
                                                    key={step.id}
                                                    onClick={() => setActiveStep(step)}
                                                    className={`
                                                        p-5 rounded-2xl border cursor-pointer flex items-center justify-between group transition-all
                                                        ${activeStep?.id === step.id
                                                            ? 'bg-surface-container-lowest border-primary/20 shadow-md ring-1 ring-primary/5'
                                                            : 'bg-surface-container-lowest border-border/40 hover:border-primary/20 hover:shadow-sm'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-10 w-10 rounded-xl bg-canvas border border-border/40 flex items-center justify-center text-on-surface font-bold text-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-bold transition-colors ${activeStep?.id === step.id ? 'text-primary' : 'text-on-surface'}`}>{step.title}</h4>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted/60">
                                                                {step.content_type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                                        className="p-2.5 text-foreground-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 outline-none cursor-pointer"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Step Content Editor (Right Panel) */}
                            {activeStep && (
                                <div className="flex-1 bg-canvas border-l border-border/40 flex flex-col animate-slideInRight z-20 absolute inset-0 md:static shadow-2xl md:shadow-none">
                                    <div className="h-16 border-b border-border/40 flex items-center justify-between px-8 bg-canvas">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setActiveStep(null)}
                                                className="md:hidden text-foreground-muted hover:text-on-surface"
                                            >
                                                <ArrowLeftIcon className="h-5 w-5" />
                                            </button>
                                            <span className="text-sm font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-2">
                                                <PencilIcon className="h-4 w-4 text-primary" />
                                                Editando: <span className="text-on-surface">{activeStep.title}</span>
                                            </span>
                                        </div>
                                        <Button onClick={handleSaveStepContent} size="sm" className="gap-2 !bg-primary !text-primary-foreground !rounded-full px-6 shadow-sm hover:opacity-90 outline-none">
                                            <SaveIcon className="h-4 w-4" />
                                            <span className="font-bold text-xs uppercase tracking-wider">Salvar</span>
                                        </Button>
                                    </div>

                                    <div className="flex-1 p-8 overflow-y-auto">
                                        <div className="max-w-2xl mx-auto space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">
                                                    {activeStep.content_type === 'tool_redirect' ? 'Instrução do Atalho' : 'Título da Lição/Tarefa'}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none font-bold"
                                                    value={activeStep.title || ''}
                                                    onChange={(e) => setActiveStep({ ...activeStep, title: e.target.value })}
                                                />
                                            </div>

                                            {/* Dynamic Content Editors */}
                                            {activeStep.content_type === 'tool_redirect' && (
                                                <div className="space-y-4 animate-fadeIn">
                                                    <div className="bg-fuchsia-50 dark:bg-fuchsia-900/10 p-5 rounded-2xl flex gap-4 text-sm text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-100 dark:border-fuchsia-800/40">
                                                        <LinkIcon className="h-6 w-6 flex-shrink-0" />
                                                        <p className="font-medium">O paciente será redirecionado para a ferramenta selecionada abaixo.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-4">Escolha a Ferramenta Alvo</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* RPD */}
                                                            <div 
                                                                onClick={() => setActiveStep({ ...activeStep, content_data: { ...activeStep.content_data, target_tool: 'rpd' }})}
                                                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${activeStep.content_data?.target_tool === 'rpd' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-border/40 hover:border-fuchsia-300'}`}
                                                            >
                                                                <DocumentTextIcon className="w-8 h-8 text-fuchsia-600" />
                                                                <div>
                                                                    <div className="font-bold text-sm">Registro de Pensamentos</div>
                                                                    <div className="text-xs text-foreground-muted">Formulário de RPD</div>
                                                                </div>
                                                            </div>
                                                            {/* Breathing */}
                                                            <div 
                                                                onClick={() => setActiveStep({ ...activeStep, content_data: { ...activeStep.content_data, target_tool: 'breathing' }})}
                                                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${activeStep.content_data?.target_tool === 'breathing' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-border/40 hover:border-fuchsia-300'}`}
                                                            >
                                                                <span className="text-2xl">💨</span>
                                                                <div>
                                                                    <div className="font-bold text-sm">Respiração Guiada</div>
                                                                    <div className="text-xs text-foreground-muted">Treino Parassimpático</div>
                                                                </div>
                                                            </div>
                                                            {/* Coping Cards */}
                                                            <div 
                                                                onClick={() => setActiveStep({ ...activeStep, content_data: { ...activeStep.content_data, target_tool: 'coping_cards' }})}
                                                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${activeStep.content_data?.target_tool === 'coping_cards' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-border/40 hover:border-fuchsia-300'}`}
                                                            >
                                                                <span className="text-2xl">🛡️</span>
                                                                <div>
                                                                    <div className="font-bold text-sm">Cartões de Enfrentamento</div>
                                                                    <div className="text-xs text-foreground-muted">Lembretes para crise</div>
                                                                </div>
                                                            </div>
                                                            {/* Mindfulness */}
                                                            <div 
                                                                onClick={() => setActiveStep({ ...activeStep, content_data: { ...activeStep.content_data, target_tool: 'mindfulness' }})}
                                                                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${activeStep.content_data?.target_tool === 'mindfulness' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-border/40 hover:border-fuchsia-300'}`}
                                                            >
                                                                <span className="text-2xl">✨</span>
                                                                <div>
                                                                    <div className="font-bold text-sm">Diário de Mindfulness</div>
                                                                    <div className="text-xs text-foreground-muted">Valores e Humor</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeStep.content_type === 'self_monitoring' && (
                                                <div className="animate-fadeIn">
                                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Rótulo da Escala (ex: Ansiedade, Urgência)</label>
                                                    <input
                                                        className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none font-medium"
                                                        value={activeStep.content_data?.label || ''}
                                                        onChange={(e) => setActiveStep({
                                                            ...activeStep,
                                                            content_data: { ...activeStep.content_data, label: e.target.value }
                                                        })}
                                                        placeholder="Ex: Nível de Ansiedade"
                                                    />
                                                </div>
                                            )}
                                            {activeStep.content_type === 'text' && (
                                                <div className="animate-fadeIn">
                                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Conteúdo (Markdown)</label>
                                                    <textarea
                                                        className="w-full h-[500px] p-5 border border-border/40 rounded-2xl bg-surface-container-lowest font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-primary outline-none"
                                                        value={activeStep.content_data?.text || ''}
                                                        onChange={(e) => setActiveStep({
                                                            ...activeStep,
                                                            content_data: { ...activeStep.content_data, text: e.target.value }
                                                        })}
                                                        placeholder="# Introdução&#10;&#10;Escreva o conteúdo educativo aqui..."
                                                    />
                                                </div>
                                            )}

                                            {activeStep.content_type === 'free_response' && (
                                                <div className="animate-fadeIn space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Instrução de Reflexão</label>
                                                        <textarea
                                                            className="w-full h-24 p-4 border border-border/40 rounded-2xl bg-surface-container-lowest font-medium text-sm leading-relaxed resize-none focus:ring-2 focus:ring-primary outline-none"
                                                            value={activeStep.content_data?.instruction || ''}
                                                            onChange={(e) => setActiveStep({
                                                                ...activeStep,
                                                                content_data: { ...activeStep.content_data, instruction: e.target.value }
                                                            })}
                                                            placeholder="Ex: Como você se sentiu após a discussão?"
                                                        />
                                                    </div>
                                                    <div className="bg-sky-50 dark:bg-sky-900/10 p-5 rounded-2xl flex gap-4 text-sm text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800/40">
                                                        <ChatBubbleLeftRightIcon className="h-6 w-6 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-bold mb-1">Fórmula Estruturada (Placeholder)</p>
                                                            <p className="text-xs opacity-80">Defina um texto que aparecerá de fundo na caixa do paciente. Ex: "Quando tu me chamas de ____, eu sinto-me _____."</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Placeholder</label>
                                                        <textarea
                                                            className="w-full h-24 p-4 border border-border/40 rounded-2xl bg-surface-container-lowest font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-primary outline-none"
                                                            value={activeStep.content_data?.placeholder || ''}
                                                            onChange={(e) => setActiveStep({
                                                                ...activeStep,
                                                                content_data: { ...activeStep.content_data, placeholder: e.target.value }
                                                            })}
                                                            placeholder="Digite a fórmula aqui..."
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {activeStep.content_type === 'video' && (
                                                <div className="space-y-4 animate-fadeIn">
                                                    <div className="bg-primary/5 p-5 rounded-2xl flex gap-4 text-sm text-primary border border-primary/10">
                                                        <VideoCameraIcon className="h-6 w-6 flex-shrink-0" />
                                                        <p className="font-medium">Cole o link de embed do YouTube (ex: youtube.com/embed/...) para que o paciente possa assistir diretamente na plataforma.</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">URL do Vídeo</label>
                                                        <input
                                                            type="text"
                                                            className="w-full p-4 border border-border/40 rounded-2xl bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none"
                                                            value={activeStep.content_data?.url || ''}
                                                            onChange={(e) => setActiveStep({
                                                                ...activeStep,
                                                                content_data: { ...activeStep.content_data, url: e.target.value }
                                                            })}
                                                            placeholder="https://www.youtube.com/embed/..."
                                                        />
                                                    </div>
                                                    {activeStep.content_data?.url && (
                                                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black mt-4">
                                                            <iframe
                                                                src={activeStep.content_data.url}
                                                                className="w-full h-full"
                                                                frameBorder="0"
                                                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeStep.content_type === 'reflection' && (
                                                <div className="space-y-4 animate-fadeIn">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Pergunta para Reflexão</label>
                                                        <textarea
                                                            className="w-full h-40 p-5 border border-border/40 rounded-2xl bg-surface-container-lowest font-bold text-xl tracking-tight outline-none focus:ring-2 focus:ring-primary resize-none"
                                                            value={activeStep.content_data?.question || ''}
                                                            onChange={(e) => setActiveStep({
                                                                ...activeStep,
                                                                content_data: { ...activeStep.content_data, question: e.target.value }
                                                            })}
                                                            placeholder="Ex: Como você se sentiu ao realizar este exercício?"
                                                        />
                                                    </div>
                                                </div>
                                            )}


                                            {activeStep.content_type === 'checklist' && (
                                                <div className="space-y-4 animate-fadeIn">
                                                    <div className="bg-primary/5 p-5 rounded-2xl flex gap-4 text-sm text-primary border border-primary/10 mb-4">
                                                        <ClipboardListIcon className="h-6 w-6 flex-shrink-0" />
                                                        <p className="font-medium">Crie uma lista de tarefas práticas para o paciente realizar. Ele poderá marcar cada item como concluído.</p>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {((activeStep.content_data?.items as any[]) || []).map((item: any, idx: number) => (
                                                            <div key={idx} className="flex gap-2 items-center">
                                                                <input
                                                                    type="text"
                                                                    value={item.text}
                                                                    onChange={(e) => {
                                                                        setActiveStep(prev => {
                                                                            if (!prev) return null;
                                                                            const currentItems = (prev.content_data?.items as any[]) || [];
                                                                            const newItems = [...currentItems];
                                                                            newItems[idx] = { ...item, text: e.target.value };
                                                                            return {
                                                                                ...prev,
                                                                                content_data: { ...prev.content_data, items: newItems }
                                                                            };
                                                                        });
                                                                    }}
                                                                    className="flex-1 p-3 border border-border/40 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary outline-none"
                                                                    placeholder={`Item ${idx + 1}`}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveStep(prev => {
                                                                            if (!prev) return null;
                                                                            const currentItems = (prev.content_data?.items as any[]) || [];
                                                                            const newItems = currentItems.filter((_, i) => i !== idx);
                                                                            return {
                                                                                ...prev,
                                                                                content_data: { ...prev.content_data, items: newItems }
                                                                            };
                                                                        });
                                                                    }}
                                                                    className="p-3 text-foreground-muted hover:text-red-500 rounded-xl hover:bg-red-50 transition-all outline-none cursor-pointer"
                                                                >
                                                                    <TrashIcon className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setActiveStep(prev => {
                                                                    if (!prev) return null;
                                                                    const currentItems = (prev.content_data?.items as any[]) || [];
                                                                    const newItem = { id: Date.now().toString(), text: '' };
                                                                    return {
                                                                        ...prev,
                                                                        content_data: { ...prev.content_data, items: [...currentItems, newItem] }
                                                                    };
                                                                });
                                                            }}
                                                            className="text-primary hover:bg-primary/5 font-bold !rounded-full px-6"
                                                        >
                                                            <PlusIcon className="h-4 w-4 mr-1.5" /> Adicionar Item
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-24 h-24 rounded-full bg-surface-container-lowest border border-border/40 flex items-center justify-center mb-6 shadow-sm">
                                <BookOpenIcon className="h-10 w-10 text-foreground-muted opacity-40" />
                            </div>
                            <h3 className="text-xl font-bold text-on-surface">{trailType === 'practice' ? 'Selecione um bloco' : 'Selecione um módulo'}</h3>
                            <p className="text-foreground-muted mt-2 max-w-xs mx-auto text-sm">
                                {trailType === 'practice' ? 'Use a barra lateral esquerda para organizar os blocos da sua tarefa.' : 'Use a barra lateral esquerda para organizar a estrutura da sua trilha educativa.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>,
        document.body
    );
};
