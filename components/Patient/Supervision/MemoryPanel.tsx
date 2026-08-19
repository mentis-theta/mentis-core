import React, { useEffect, useState } from 'react';
import { patientMemoryService } from '@/services/patientMemoryService';
import { backfillPatientMemory } from '@/services/memoryBackfillService';
import type { PatientMemoryFact } from '@/types';
import { Brain, Trash2, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';

interface MemoryPanelProps {
    patient: any;
    currentUser: any;
}

const MemoryPanel: React.FC<MemoryPanelProps> = ({ patient }) => {
    const { addToast } = useToast();
    const { data: decoupledData, isLoading: isDecoupledLoading } = useDecoupledData(patient?.id || '', 'full_audit');
    const [facts, setFacts] = useState<PatientMemoryFact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (patient?.id) {
            loadMemory();
        }
    }, [patient?.id]);

    const loadMemory = async () => {
        setIsLoading(true);
        try {
            const data = await patientMemoryService.fetchPatientMemory(patient.id);
            setFacts(data);
        } catch (error) {
            console.error('Error loading memory:', error);
            addToast('Erro ao carregar a memória clínica.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (factId: string) => {
        if (!confirm('Deseja realmente apagar este fato da memória da IA?')) return;
        setIsDeleting(factId);
        try {
            await patientMemoryService.deleteFact(factId);
            setFacts(prev => prev.filter(f => f.id !== factId));
            addToast('Fato removido da memória.', 'success');
        } catch (error) {
            addToast('Erro ao deletar fato.', 'error');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleBackfill = async () => {
        setIsSyncing(true);
        try {
            const fullPatient = {
                ...patient,
                sessions: decoupledData?.sessions || [],
                documents: decoupledData?.documents || [],
                goals: decoupledData?.goals || []
            };
            const result = await backfillPatientMemory(fullPatient);
            const total = result.sessionsIngested + result.rpdsIngested + result.inventoriesIngested + result.anamnesisIngested;

            if (total === 0 && result.errors.length === 0) {
                addToast('Memória já está atualizada! Nenhum dado novo encontrado.', 'info');
            } else if (total > 0) {
                const parts = [];
                if (result.sessionsIngested > 0) parts.push(`${result.sessionsIngested} de Sessões`);
                if (result.rpdsIngested > 0) parts.push(`${result.rpdsIngested} RPDs`);
                if (result.inventoriesIngested > 0) parts.push(`${result.inventoriesIngested} Inventários`);
                if (result.anamnesisIngested > 0) parts.push(`${result.anamnesisIngested} de Anamnese`);
                addToast(`Sincronização concluída! ${total} fatos importados (${parts.join(', ')}).`, 'success');
                await loadMemory();
            }

            if (result.errors.length > 0) {
                addToast(`Alguns dados não puderam ser importados: ${result.errors.join(', ')}`, 'warning');
            }
        } catch (error: any) {
            console.error('Backfill error:', error);
            addToast('Erro ao sincronizar memória histórica.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading || isDecoupledLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                        <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Knowledge Graph (Memória da IA)</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Fatos clínicos indexados automaticamente pela curadoria de documentos.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleBackfill}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Importar dados históricos (RPDs, Inventários e Anamnese) para a memória da IA"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Histórico'}
                </button>
            </div>

            {facts.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">Nenhum fato clínico salvo na memória ainda.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {facts.map(fact => (
                        <div key={fact.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/30 flex flex-col gap-3 relative group transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                    {fact.type}
                                </span>
                                <div className="flex items-center gap-2">
                                    {fact.status === 'approved' ? (
                                        <span title="Aprovado no Laudo"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></span>
                                    ) : (
                                        <span title="Rejeitado no Laudo"><XCircle className="w-4 h-4 text-rose-500" /></span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(fact.id)}
                                        disabled={isDeleting === fact.id}
                                        className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                        title="Excluir fato"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                {fact.text}
                            </p>
                            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span>
                                    Origem: {fact.source_type === 'session' ? `${fact.source_refs?.length || 0} sessões` : 
                                             fact.source_type === 'anamnesis' ? 'Anamnese' : 
                                             fact.source_type === 'psychometrics' ? 'Teste Psicométrico' : 
                                             fact.source_type === 'supervision' ? 'Insight de Supervisão' : 'Outros'}
                                </span>
                                <span>Salvo em {new Date(fact.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MemoryPanel;
