import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useTrails } from '@/hooks/useTrails';
import { Trail, StepContentType } from '@/types';
import { Patient } from '@/types';
import { useCrypto } from '@/contexts/CryptoContext';
import { decryptData, decryptAsymmetric } from '@/services/cryptoService';
import { Beaker, BarChart3, MessageSquare, ClipboardList, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, Layers, Lock } from 'lucide-react';

interface PracticesDashboardProps {
    patient: Patient;
}

// ─── Config ──────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    behavioral_experiment: {
        icon: <Beaker className="w-4 h-4" />,
        label: 'Experimento',
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-900/20'
    },
    self_monitoring: {
        icon: <BarChart3 className="w-4 h-4" />,
        label: 'Monitoramento',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    free_response: {
        icon: <MessageSquare className="w-4 h-4" />,
        label: 'Reflexão',
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-900/20'
    }
};

const DEFAULT_TYPE = {
    icon: <ClipboardList className="w-4 h-4" />,
    label: 'Micro-Workflow',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/20'
};

// ─── Helpers ──────────────────────────────────────────────
function getDueDateStatus(dueDate?: string): { label: string; status: 'ok' | 'urgent' | 'overdue' } {
    if (!dueDate) return { label: 'Sem prazo', status: 'ok' };
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasado`, status: 'overdue' };
    if (diffDays <= 2) return { label: diffDays === 0 ? 'Vence hoje' : `${diffDays}d restante${diffDays > 1 ? 's' : ''}`, status: 'urgent' };
    return { label: `${diffDays}d restantes`, status: 'ok' };
}

// ─── Response Renderers ──────────────────────────────────────────
const BehavioralExperimentView: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 block mb-1">🔮 Predição</span>
                <p className="text-sm text-on-surface">{data.prediction}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">📝 O que aconteceu</span>
                <p className="text-sm text-on-surface">{data.what_happened}</p>
            </div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">💡 Aprendizado</span>
            <p className="text-sm text-on-surface">{data.what_learned}</p>
        </div>
        <div className="flex gap-4">
            <div className="flex-1 text-center p-2 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/40">
                <span className="text-[10px] font-bold uppercase text-red-400 block">SUDS Antes</span>
                <span className="text-2xl font-black text-red-600">{data.anxiety_before}</span>
                <span className="text-xs text-red-400">/10</span>
            </div>
            <div className="flex-1 text-center p-2 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/40">
                <span className="text-[10px] font-bold uppercase text-green-400 block">SUDS Depois</span>
                <span className="text-2xl font-black text-green-600">{data.anxiety_after}</span>
                <span className="text-xs text-green-400">/10</span>
            </div>
            {data.anxiety_before > data.anxiety_after && (
                <div className="flex-1 text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block">Redução</span>
                    <span className="text-2xl font-black text-emerald-600">-{data.anxiety_before - data.anxiety_after}</span>
                    <span className="text-xs text-emerald-400">pts</span>
                </div>
            )}
        </div>
    </div>
);

const SelfMonitoringView: React.FC<{ data: any }> = ({ data }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
            <div className="text-center">
                <span className="text-3xl font-black text-emerald-600">{data.scale_value}</span>
                <span className="text-sm text-emerald-400">/10</span>
            </div>
            <div className="flex-1">
                <div className="h-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                        style={{ width: `${(data.scale_value / 10) * 100}%` }}
                    />
                </div>
                {data.label && <span className="text-xs text-emerald-500 mt-1 block">{data.label}</span>}
            </div>
        </div>
        {data.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-border/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block mb-1">Observações</span>
                <p className="text-sm text-on-surface">{data.notes}</p>
            </div>
        )}
    </div>
);

const FreeResponseView: React.FC<{ data: any }> = ({ data }) => (
    <div className="p-4 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-100 dark:border-sky-800/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block mb-2">Reflexão</span>
        <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{data.text}</p>
    </div>
);

// ─── Practice Item ──────────────────────────────────────────
interface PracticeItemData {
    practice: Trail & { due_date?: string; therapist_instructions?: string };
    responses: any[];
    isCompleted: boolean;
}

const PracticeItem: React.FC<{ item: PracticeItemData }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { practice, responses, isCompleted } = item;

    // Use default type for multi-step workflows to represent a "block" collection
    const config = DEFAULT_TYPE;
    const dueDateInfo = getDueDateStatus(practice.due_date);

    return (
        <div className={`bg-surface rounded-2xl border overflow-hidden transition-all duration-300 ${
            isCompleted
                ? 'border-green-200 dark:border-green-800/50'
                : dueDateInfo.status === 'overdue'
                    ? 'border-red-200 dark:border-red-800/50'
                    : 'border-border/60'
        }`}>
            {/* Header row */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
            >
                {/* Icon */}
                <div className={`p-2 rounded-xl ${config.bg} ${config.color} flex-shrink-0`}>
                    {isCompleted ? <Layers className="w-4 h-4 text-green-500" /> : <Layers className="w-4 h-4" />}
                </div>

                {/* Title + Meta */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm truncate ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-on-surface'}`}>
                        {practice.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            isCompleted ? 'text-green-500' :
                            dueDateInfo.status === 'overdue' ? 'text-red-500' :
                            dueDateInfo.status === 'urgent' ? 'text-amber-500' : 'text-foreground-muted'
                        }`}>
                            {isCompleted ? (
                                <><CheckCircle2 className="w-3 h-3" /> {responses.length} {responses.length === 1 ? 'Registro' : 'Registros'}</>
                            ) : dueDateInfo.status === 'overdue' ? (
                                <><AlertCircle className="w-3 h-3" /> {dueDateInfo.label}</>
                            ) : (
                                <><Clock className="w-3 h-3" /> {dueDateInfo.label}</>
                            )}
                        </span>
                    </div>
                </div>

                {/* Expand/Collapse */}
                <div className="flex-shrink-0 text-foreground-muted">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-[fadeIn_200ms_ease-out] border-t border-border/30 pt-4 bg-canvas/30">
                    {/* Therapist Instructions */}
                    {practice.therapist_instructions && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">📋 Suas Instruções</span>
                            <p className="text-sm text-indigo-800 dark:text-indigo-200">{practice.therapist_instructions}</p>
                        </div>
                    )}

                    {/* Patient Responses */}
                    {isCompleted && responses.length > 0 ? (
                        <div className="space-y-6">
                            {responses.map((response, idx) => (
                                <div key={response.id} className="pt-4 border-t border-border/30 first:pt-0 first:border-0 relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            #{responses.length - idx}
                                        </div>
                                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                                            <span className="text-foreground-muted font-bold normal-case">
                                                {new Date(response.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </h5>
                                    </div>
                                    
                                    <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                                        {Object.values(response.response_data || {}).map((stepData: any, sidx) => {
                                            if (stepData.response_type === 'behavioral_experiment') return <BehavioralExperimentView key={sidx} data={stepData} />;
                                            if (stepData.response_type === 'self_monitoring') return <SelfMonitoringView key={sidx} data={stepData} />;
                                            if (stepData.response_type === 'free_response') return <FreeResponseView key={sidx} data={stepData} />;
                                            return null;
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-foreground-muted bg-surface rounded-xl border border-border/40">
                            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">Aguardando registro do paciente</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Dashboard ──────────────────────────────────────────
const PracticesDashboard: React.FC<PracticesDashboardProps> = ({ patient }) => {
    const { trails: practices, loading } = useTrails(patient.id, 'practice');
    const [responsesMap, setResponsesMap] = useState<Record<string, any[]>>({});
    const [loadingProgress, setLoadingProgress] = useState(true);

    const { masterKey } = useCrypto();

    // Fetch progress from new practice_responses table
    useEffect(() => {
        if (!patient.id || practices.length === 0 || !masterKey) {
            setLoadingProgress(false);
            return;
        }

        const fetchProgress = async () => {
            const practiceIds = practices.map(p => p.id);

            const { data, error } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('patient_id', patient.id)
                .in('trail_id', practiceIds)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Decrypt Responses!
                const encryptedPrivateKey = localStorage.getItem('mentis_private_key');
                let privateKeyStr: string | null = null;
                
                if (encryptedPrivateKey) {
                    try {
                        privateKeyStr = decryptData(encryptedPrivateKey, masterKey);
                    } catch (e) {
                        console.error('Failed to unwrap private key', e);
                    }
                }

                const map: Record<string, any[]> = {};
                for (const row of data) {
                    if (row.encrypted_response && privateKeyStr) {
                        try {
                            const decryptedAnswers = await decryptAsymmetric<any>(row.encrypted_response, privateKeyStr);
                            row.response_data = decryptedAnswers;
                        } catch (e) {
                            console.error('Failed to decrypt patient response', e);
                            row.response_data = { error: 'Descriptografia Falhou. Chave Incorreta.' };
                        }
                    }

                    if (!map[row.trail_id]) map[row.trail_id] = [];
                    map[row.trail_id].push(row);
                }
                setResponsesMap(map);
            }
            setLoadingProgress(false);
        };

        fetchProgress();
    }, [patient.id, practices, masterKey]);

    // Build items
    const items: PracticeItemData[] = practices.map(practice => {
        const responses = responsesMap[practice.id] || [];
        return {
            practice: practice as any,
            responses,
            isCompleted: responses.length > 0
        };
    });

    const pendingItems = items.filter(i => !i.isCompleted);
    const completedItems = items.filter(i => i.isCompleted);
    const completedCount = completedItems.length;
    const totalCount = items.length;

    if (loading || loadingProgress) {
        return (
            <div className="text-center py-12 text-foreground-muted">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-200 border-t-violet-600 mx-auto mb-3"></div>
                <p className="text-sm">Carregando práticas...</p>
            </div>
        );
    }

    if (totalCount === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-foreground-muted">Nenhuma prática prescrita</h3>
                <p className="text-sm text-foreground-muted mt-1">
                    Prescreva práticas durante a sessão para monitorar a aderência e registros do paciente.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/60 shadow-sm">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-on-surface">Aderência</span>
                        <span className="text-sm font-black text-violet-600">
                            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                        </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000"
                            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                </div>
                <div className="flex gap-3 text-center">
                    <div className="px-3">
                        <span className="text-xl font-black text-on-surface block">{totalCount}</span>
                        <span className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider">Total</span>
                    </div>
                    <div className="px-3 border-l border-border/40">
                        <span className="text-xl font-black text-green-600 block">{completedCount}</span>
                        <span className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider">Iniciadas</span>
                    </div>
                    <div className="px-3 border-l border-border/40">
                        <span className="text-xl font-black text-amber-500 block">{pendingItems.length}</span>
                        <span className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider">Pendentes</span>
                    </div>
                </div>
            </div>

            {/* Pending Practices */}
            {pendingItems.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Pendentes ({pendingItems.length})
                    </h3>
                    <div className="space-y-3">
                        {pendingItems.map(item => (
                            <PracticeItem key={item.practice.id} item={item} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Practices */}
            {completedItems.length > 0 && (
                <div className="pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        Práticas Ativas ({completedItems.length})
                    </h3>
                    <div className="space-y-3">
                        {completedItems.map(item => (
                            <PracticeItem key={item.practice.id} item={item} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PracticesDashboard;
