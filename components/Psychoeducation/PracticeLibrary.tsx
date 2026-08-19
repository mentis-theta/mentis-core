import React, { useState, useMemo } from 'react';
import { useTrails } from '@/hooks/useTrails';
import { Trail } from '@/types';
import {
    BookOpenIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ClipboardListIcon
} from '@/components/Icons';
import { TrailBuilder } from './TrailBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Beaker, BarChart3, MessageSquare, Link, Layers, Zap } from 'lucide-react';

export const PracticeLibrary: React.FC = () => {
    const { trails: practices, loading, deleteTrail: deletePractice, refresh } = useTrails(undefined, 'practice');
    const { currentUser } = useAuth();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedPractice, setSelectedPractice] = useState<Trail | null>(null);
    const confirm = useConfirm();

    const myPractices = useMemo(() => 
        practices.filter(t => t.author_id === currentUser?.id), 
    [practices, currentUser?.id]);

    const handleCreateNew = () => {
        setSelectedPractice(null);
        setIsBuilderOpen(true);
    };

    const handleEdit = (practice: Trail) => {
        setSelectedPractice(practice);
        setIsBuilderOpen(true);
    };

    const handleDelete = async (practiceId: string) => {
        const isConfirmed = await confirm({
            title: "Excluir Tarefa",
            message: "Tem certeza que deseja excluir esta tarefa? Pacientes que já a receberam não perderão o progresso.",
            confirmText: "Excluir"
        });
        if (isConfirmed) {
            await deletePractice(practiceId);
        }
    };

    const handleCloseBuilder = () => {
        setIsBuilderOpen(false);
        setSelectedPractice(null);
        refresh();
    };

    // Conta o total de steps interativos (ignora blocos de texto puro)
    const getStepCount = (practice: Trail): number => {
        return practice.modules?.[0]?.steps?.length || 0;
    };

    const isMultiStep = (practice: Trail): boolean => {
        return getStepCount(practice) > 1;
    };

    const getStepTypeIcon = (practice: Trail) => {
        if (isMultiStep(practice)) return <Layers className="w-4 h-4 text-violet-500" />;
        const stepType = practice.modules?.[0]?.steps?.[0]?.content_type;
        switch (stepType) {
            case 'behavioral_experiment': return <Beaker className="w-4 h-4 text-violet-500" />;
            case 'self_monitoring': return <BarChart3 className="w-4 h-4 text-emerald-500" />;
            case 'free_response': return <MessageSquare className="w-4 h-4 text-sky-500" />;
            case 'tool_redirect': return <Link className="w-4 h-4 text-fuchsia-500" />;
            default: return <ClipboardListIcon className="h-4 w-4 text-slate-400" />;
        }
    };

    const getStepTypeLabel = (practice: Trail) => {
        const count = getStepCount(practice);
        if (count > 1) return `Tarefa · ${count} blocos`;
        const stepType = practice.modules?.[0]?.steps?.[0]?.content_type;
        switch (stepType) {
            case 'behavioral_experiment': return 'Experimento';
            case 'self_monitoring': return 'Monitoramento';
            case 'free_response': return 'Reflexão';
            case 'tool_redirect': return 'Atalho';
            default: return 'Prática';
        }
    };

    // Gera o gradiente do topo do card baseado na composição de blocos
    const getCardGradient = (practice: Trail): string => {
        if (isMultiStep(practice)) return 'from-violet-500 via-purple-500 to-indigo-500';
        const stepType = practice.modules?.[0]?.steps?.[0]?.content_type;
        switch (stepType) {
            case 'behavioral_experiment': return 'from-violet-500 to-purple-600';
            case 'self_monitoring': return 'from-emerald-500 to-teal-600';
            case 'free_response': return 'from-sky-500 to-blue-600';
            case 'tool_redirect': return 'from-fuchsia-500 to-pink-600';
            default: return 'from-violet-500 to-purple-600';
        }
    };

    if (isBuilderOpen) {
        return (
            <TrailBuilder
                initialTrail={selectedPractice}
                onClose={handleCloseBuilder}
                trailType="practice"
            />
        );
    }

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-canvas">
            <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-foreground-muted">Carregando tarefas...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto px-8 pb-12 bg-canvas space-y-12 animate-fadeIn scrollbar-thin">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
                <div>
                    <h1 className="text-[28px] font-bold text-on-surface font-sans m-0 tracking-tight flex items-center gap-3">
                        <ClipboardListIcon className="h-8 w-8 text-violet-500" />
                        Tarefas & Práticas
                    </h1>
                    <p className="text-foreground-muted mt-1 text-lg">
                        Monte fluxos de intervenção empilhando blocos clínicos para prescrever entre sessões.
                    </p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer outline-none"
                >
                    <PlusIcon className="h-5 w-5" />
                    Nova Tarefa
                </button>
            </header>

            {/* Quick Info — Blocos disponíveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-violet-50 dark:bg-violet-900/10 p-5 rounded-2xl border border-violet-100 dark:border-violet-800/40">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-800/30">
                            <Beaker className="w-5 h-5 text-violet-600" />
                        </div>
                        <h3 className="font-bold text-sm text-violet-800 dark:text-violet-200">Experimento</h3>
                    </div>
                    <p className="text-xs text-violet-600 dark:text-violet-300 leading-relaxed">
                        Predição → Ação → Aprendizado com escala SUDS. Ideal para testar crenças.
                    </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-800/30">
                            <BarChart3 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">Monitoramento</h3>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300 leading-relaxed">
                        Escala 0-10 com anotações. O paciente registra sempre que a situação ocorre.
                    </p>
                </div>
                <div className="bg-sky-50 dark:bg-sky-900/10 p-5 rounded-2xl border border-sky-100 dark:border-sky-800/40">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-800/30">
                            <MessageSquare className="w-5 h-5 text-sky-600" />
                        </div>
                        <h3 className="font-bold text-sm text-sky-800 dark:text-sky-200">Reflexão Livre</h3>
                    </div>
                    <p className="text-xs text-sky-600 dark:text-sky-300 leading-relaxed">
                        Campo aberto com fórmula clínica no placeholder. Guia a escrita do paciente.
                    </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/40">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/30">
                            <Layers className="w-5 h-5 text-slate-600" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Empilhamento</h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Combine blocos num único fluxo vertical. Ex: Texto guia + Escala + Reflexão.
                    </p>
                </div>
            </div>

            {/* Practice Cards */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-foreground-muted">
                        Minhas Tarefas
                    </h2>
                    <span className="bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 px-3 py-1 rounded-full text-xs font-bold">
                        {myPractices.length}
                    </span>
                </div>

                {myPractices.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-3xl p-16 text-center border-2 border-dashed border-violet-200/40 dark:border-violet-800/30">
                        <ClipboardListIcon className="h-16 w-16 text-violet-200 mx-auto mb-4 opacity-50" />
                        <h3 className="text-on-surface font-bold text-lg mb-2">Nenhuma tarefa criada ainda</h3>
                        <p className="text-foreground-muted mb-4 max-w-md mx-auto">
                            Monte fluxos empilhando blocos de intervenção (texto, escala, reflexão) e prescreva ao paciente.
                        </p>
                        <p className="text-foreground-muted text-xs mb-8 max-w-md mx-auto">
                            💡 <strong>Dica:</strong> Tarefas simples (1 bloco) também podem ser prescritas direto na sidebar da sessão.
                        </p>
                        <button onClick={handleCreateNew} className="text-violet-600 font-bold hover:underline cursor-pointer outline-none">
                            Criar minha primeira tarefa
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myPractices.map(practice => (
                            <div key={practice.id} className="bg-surface-container-lowest rounded-3xl border border-border/40 shadow-sm hover:shadow-md transition-all group flex flex-col h-full overflow-hidden">
                                <div className={`h-1.5 w-full bg-gradient-to-r ${getCardGradient(practice)}`}></div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                                            {getStepTypeIcon(practice)}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(practice)}
                                                className="p-2 text-foreground-muted hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(practice.id)}
                                                className="p-2 text-foreground-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-on-surface mb-2 line-clamp-1">
                                        {practice.title}
                                    </h3>
                                    <p className="text-sm text-foreground-muted line-clamp-3 mb-6 flex-1">
                                        {practice.description || "Sem descrição definida."}
                                    </p>

                                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-bold text-foreground-muted mt-auto pt-4 border-t border-border/40 flex-wrap">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 ${isMultiStep(practice)
                                                ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 ring-violet-100 dark:ring-violet-800/50'
                                                : 'bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700/50'
                                            }`}>
                                            {getStepTypeIcon(practice)}
                                            {getStepTypeLabel(practice)}
                                        </span>
                                        <span className="ml-auto">
                                            {new Date(practice.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEdit(practice)}
                                    className="w-full py-4 bg-surface-container-lowest hover:bg-violet-50 dark:hover:bg-violet-900/10 border-t border-border/40 text-sm font-bold text-foreground-muted hover:text-violet-600 transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Gerenciar Tarefa
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};
