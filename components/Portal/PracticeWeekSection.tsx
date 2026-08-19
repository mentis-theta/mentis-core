import React from 'react';
import { Trail, StepContentType } from '@/types';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { Beaker, BarChart3, MessageSquare, Clock, CheckCircle2, ChevronRight, ClipboardList, AlertCircle } from 'lucide-react';

interface PracticeWeekSectionProps {
    practices: (Trail & {
        due_date?: string;
        therapist_instructions?: string;
        assignment_status?: string;
    })[];
    completedStepIds: Set<string>;
}

const STEP_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; gradient: string; border: string; badge: string }> = {
    behavioral_experiment: {
        icon: <Beaker className="w-5 h-5" />,
        label: 'Experimento',
        gradient: 'from-violet-500 to-purple-600',
        border: 'border-violet-200 dark:border-violet-800 hover:border-violet-300',
        badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
    },
    self_monitoring: {
        icon: <BarChart3 className="w-5 h-5" />,
        label: 'Monitoramento',
        gradient: 'from-emerald-500 to-teal-600',
        border: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-300',
        badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
    },
    free_response: {
        icon: <MessageSquare className="w-5 h-5" />,
        label: 'Reflexão',
        gradient: 'from-sky-500 to-blue-600',
        border: 'border-sky-200 dark:border-sky-800 hover:border-sky-300',
        badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
    }
};

const DEFAULT_CONFIG = {
    icon: <ClipboardList className="w-5 h-5" />,
    label: 'Prática',
    gradient: 'from-slate-500 to-slate-600',
    border: 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
    badge: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
};

function getStepType(practice: Trail): StepContentType {
    const firstStep = practice.modules?.[0]?.steps?.[0];
    return firstStep?.content_type || 'free_response';
}

function isPracticeCompleted(practice: Trail, completedStepIds: Set<string>): boolean {
    const allSteps = practice.modules?.flatMap(m => m.steps || []) || [];
    if (allSteps.length === 0) return false;
    return allSteps.every(s => completedStepIds.has(s.id));
}

function getDueDateInfo(dueDate?: string): { label: string; urgent: boolean; overdue: boolean } {
    if (!dueDate) return { label: 'Sem prazo', urgent: false, overdue: false };

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasado`, urgent: false, overdue: true };
    if (diffDays === 0) return { label: 'Vence hoje', urgent: true, overdue: false };
    if (diffDays === 1) return { label: 'Vence amanhã', urgent: true, overdue: false };
    if (diffDays <= 3) return { label: `Vence em ${diffDays} dias`, urgent: true, overdue: false };

    const formatted = due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { label: `Até ${formatted}`, urgent: false, overdue: false };
}

export const PracticeWeekSection: React.FC<PracticeWeekSectionProps> = ({ practices, completedStepIds }) => {
    const { navigateTo } = usePortalNavigation();

    if (practices.length === 0) return null;

    const pending = practices.filter(p => !isPracticeCompleted(p, completedStepIds));
    const completed = practices.filter(p => isPracticeCompleted(p, completedStepIds));
    const completedCount = completed.length;
    const totalCount = practices.length;

    return (
        <section className="animate-[fadeIn_600ms_ease-out_250ms_both]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-on-surface flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2 text-violet-500" />
                    Práticas da Semana
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground-muted bg-background px-3 py-1 rounded-full border border-border/40">
                        {completedCount}/{totalCount}
                    </span>
                    {completedCount === totalCount && totalCount > 0 && (
                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-800 animate-[fadeIn_300ms_ease-out]">
                            ✨ Tudo feito!
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                </div>
            )}

            {/* Practice Cards — Horizontal scroll */}
            <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-hide">
                {/* Pending first, then completed */}
                {[...pending, ...completed].map(practice => {
                    const stepType = getStepType(practice);
                    const config = STEP_TYPE_CONFIG[stepType] || DEFAULT_CONFIG;
                    const isCompleted = isPracticeCompleted(practice, completedStepIds);
                    const dueDateInfo = getDueDateInfo((practice as any).due_date);

                    return (
                        <button
                            key={practice.id}
                            onClick={() => navigateTo(`/portal/pratica/${practice.id}`)}
                            className={`
                                flex-shrink-0 w-72 rounded-[20px] border bg-surface shadow-sm text-left
                                transition-all duration-300 group relative overflow-hidden
                                ${isCompleted
                                    ? 'border-green-200 dark:border-green-800 opacity-75 hover:opacity-100'
                                    : config.border
                                }
                                hover:shadow-md hover:-translate-y-0.5
                            `}
                        >
                            {/* Top Gradient Accent */}
                            <div className={`h-1.5 w-full bg-gradient-to-r ${isCompleted ? 'from-green-400 to-emerald-500' : config.gradient}`} />

                            <div className="p-5">
                                {/* Header: Icon + Type Badge */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${isCompleted ? 'from-green-400 to-emerald-500' : config.gradient} text-white shadow-sm`}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : config.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : config.badge}`}>
                                        {isCompleted ? 'Concluída' : config.label}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className={`font-bold text-base mb-1.5 line-clamp-2 transition-colors duration-300 ${isCompleted ? 'text-green-700 dark:text-green-300 line-through decoration-green-300' : 'text-on-surface group-hover:text-violet-600 dark:group-hover:text-violet-400'}`}>
                                    {practice.title}
                                </h3>

                                {/* Instructions Preview */}
                                {(practice as any).therapist_instructions && (
                                    <p className="text-xs text-foreground-muted line-clamp-2 mb-3 leading-relaxed">
                                        {(practice as any).therapist_instructions}
                                    </p>
                                )}

                                {/* Footer: Due Date + Arrow */}
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                                    {isCompleted ? (
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Concluída
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-medium flex items-center gap-1.5 ${
                                            dueDateInfo.overdue ? 'text-red-500' : dueDateInfo.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground-muted'
                                        }`}>
                                            {dueDateInfo.overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                            {dueDateInfo.label}
                                        </span>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 ${isCompleted ? 'text-green-400' : 'text-foreground-muted'}`} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
