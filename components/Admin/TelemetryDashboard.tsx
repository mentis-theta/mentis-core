import React, { useMemo, useState } from 'react';
import { useAITelemetry } from '../../hooks/useAITelemetry';
import { Activity, Cpu, Zap, Clock, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TelemetryDashboard: React.FC = () => {
    // Basic date filtering
    const [period, setPeriod] = useState<'current' | 'previous'>('current');
    
    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        if (period === 'current') {
            return {
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
            };
        } else {
            return {
                startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
            };
        }
    }, [period]);

    const { data: telemetry, isLoading, error } = useAITelemetry(startDate, endDate);

    const globalMetrics = useMemo(() => {
        if (!telemetry || telemetry.length === 0) return { reqs: 0, prompts: 0, completions: 0, latency: 0, cost: 0 };
        
        let reqs = 0;
        let prompts = 0;
        let completions = 0;
        let totalLatency = 0;
        let totalCost = 0;

        telemetry.forEach(t => {
            reqs += t.total_requests;
            prompts += t.total_prompt_tokens;
            completions += t.total_completion_tokens;
            totalLatency += (t.avg_latency_ms * t.total_requests); // Re-weight
            totalCost += (t.estimated_cost_usd || 0);
        });

        return {
            reqs,
            prompts,
            completions,
            cost: totalCost,
            latency: reqs > 0 ? Math.round(totalLatency / reqs) : 0
        };
    }, [telemetry]);

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                    Painel Financeiro e Desempenho de IA
                </h2>
                
                <div className="flex bg-surface-container-highest/60 rounded-xl p-1 border border-border/30">
                    <button 
                        onClick={() => setPeriod('current')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${period === 'current' ? 'bg-surface shadow-sm text-primary' : 'text-foreground-muted hover:text-on-surface'}`}
                    >
                        Mês Corrente
                    </button>
                    <button 
                        onClick={() => setPeriod('previous')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${period === 'previous' ? 'bg-surface shadow-sm text-primary' : 'text-foreground-muted hover:text-on-surface'}`}
                    >
                        Mês Passado
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-foreground-muted animate-pulse gap-3 bg-surface border border-border rounded-xl">
                    <Activity className="w-8 h-8 animate-spin" />
                    <span>Carregando métricas seguras do banco de dados...</span>
                </div>
            ) : error ? (
                <div className="p-8 flex items-center justify-center text-red-500 gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                    Erro ao carregar telemetria. Verifique se o usuário tem privilégios de Admin.
                </div>
            ) : (
                <>
                    {/* Métricas Globais de IA */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Custo Estimado (USD)</p>
                                    <h3 className="text-3xl font-bold mt-2 text-on-surface">
                                        ${globalMetrics.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h3>
                                </div>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Total de Requisições</p>
                                    <h3 className="text-3xl font-bold mt-2 text-on-surface">{globalMetrics.reqs.toLocaleString('pt-BR')}</h3>
                                </div>
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-500">
                                    <Activity className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Tokens Gerados</p>
                                    <h3 className="text-3xl font-bold mt-2 text-on-surface">
                                        {(globalMetrics.completions / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}M
                                    </h3>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                    <Zap className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Latência Média</p>
                                    <h3 className="text-3xl font-bold mt-2 text-on-surface">{globalMetrics.latency.toLocaleString('pt-BR')} ms</h3>
                                </div>
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Ranqueamento */}
                    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-surface-dim/30 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-primary" /> Ranqueamento de Custo por Psicólogo
                            </h3>
                            <div className="text-xs font-medium text-foreground-muted flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(startDate, "MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-surface-dim">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Usuário</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Custo Estimado (USD)</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Requests / Latência</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Tokens (Contexto / Gerado)</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Modelos Utilizados</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border/50">
                                    {telemetry?.sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd).map((t) => (
                                        <tr key={t.author_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-on-surface">{t.author_name || 'Desconhecido'}</div>
                                                <div className="text-xs text-foreground-muted font-mono">{t.author_id.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                                                    ${(t.estimated_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-on-surface">{t.total_requests.toLocaleString('pt-BR')} reqs</div>
                                                <div className="text-xs text-foreground-muted">avg {Math.round(t.avg_latency_ms).toLocaleString('pt-BR')} ms</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-foreground-muted font-mono">{t.total_prompt_tokens.toLocaleString('pt-BR')} (IN)</div>
                                                <div className="text-sm text-on-surface font-mono font-medium">{t.total_completion_tokens.toLocaleString('pt-BR')} (OUT)</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground-muted max-w-xs truncate" title={t.models_used}>
                                                {t.models_used || 'Desconhecido'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!telemetry || telemetry.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-foreground-muted">
                                                Nenhum uso de inteligência artificial registrado para este período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
