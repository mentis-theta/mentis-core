import React from 'react';
import { Target } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { CurrentMonthMetrics } from '@/hooks/useFinancialData';

interface FinancialGoalWidgetProps {
    data: CurrentMonthMetrics | null;
}

export const FinancialGoalWidget: React.FC<FinancialGoalWidgetProps> = ({ data }) => {
    if (!data) return null;

    const remainingToGoal = Math.max(0, data.goal - data.revenue);
    const isGoalAchieved = data.revenue >= data.goal;

    return (
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-6 flex flex-col gap-5 relative overflow-hidden transition-colors duration-200">
            {/* Header da Meta */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground-muted font-sans uppercase tracking-wide m-0">
                        Meta Mensal
                    </p>
                    <h3 className="text-3xl font-bold tracking-tight text-on-surface font-sans m-0">
                        {data.goalPercentage.toFixed(0)}%
                    </h3>
                </div>
                {/* Ícone Tonal M3 */}
                <div className="h-12 w-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Target className="w-6 h-6" />
                </div>
            </div>

            {/* Barra de Progresso e Feedback */}
            <div className="flex flex-col gap-2.5">
                <div className="w-full bg-surface-dim rounded-full h-2.5 overflow-hidden border border-border/20">
                    {/* Estilo inline mantido apenas aqui devido à injeção dinâmica da porcentagem, padrão React */}
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isGoalAchieved ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(data.goalPercentage, 100)}%` }}
                    />
                </div>
                <p className={`text-xs font-medium font-sans m-0 ${isGoalAchieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground-muted'}`}>
                    {isGoalAchieved
                        ? "Objetivo alcançado!"
                        : `Faltam ${formatCurrency(remainingToGoal)} para a meta.`}
                </p>
            </div>
        </div>
    );
};
