import React from 'react';
import { FinancialEvolutionChart } from './FinancialEvolutionChart';
import { BreakdownCharts } from './BreakdownCharts';
import { DebtorsList } from './DebtorsList';
import { FinancialGoalWidget } from './FinancialGoalWidget';
import { SwitchHorizontalIcon } from '../Icons';

interface FinancialAnalyticsDashboardProps {
    history: any[];
    daily: any[];
    current: any; // Metric object
    analytics: {
        byLocation: any[];
        byModality: any[];
        byPaymentType: any[];
    };
    debtors: any[];
    considerPending: boolean;
    onTogglePending: (val: boolean) => void;
}

export const FinancialAnalyticsDashboard: React.FC<FinancialAnalyticsDashboardProps> = ({
    history, daily, current, analytics, debtors, considerPending, onTogglePending
}) => {
    return (
        <section className="flex flex-col gap-6 animate-fade-in-down">

            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-container-lowest p-5 rounded-3xl border border-border/40 shadow-sm transition-colors duration-200">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary dark:text-primary-foreground flex items-center justify-center shrink-0">
                        <SwitchHorizontalIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-semibold text-on-surface text-sm font-sans tracking-tight m-0">Modo de Análise</h4>
                        <p className="text-xs text-foreground-muted font-medium font-sans mt-0.5 m-0">Alternar entre regime de Caixa e Competência</p>
                    </div>
                </div>

                <div className="flex items-center mt-4 sm:mt-0 bg-surface-container-low p-1.5 rounded-full border border-border/20">
                    <span className={`text-xs font-semibold px-3 transition-colors font-sans cursor-pointer ${!considerPending ? 'text-primary' : 'text-foreground-muted hover:text-on-surface'}`} onClick={() => onTogglePending(false)}>
                        Realizado (Só Pago)
                    </span>
                    <button
                        onClick={() => onTogglePending(!considerPending)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer border border-transparent ${considerPending ? 'bg-primary' : 'bg-surface-dim'
                            }`}
                        aria-label="Alternar modo de análise"
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-surface-container-lowest shadow-sm transition-transform ${considerPending ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                    </button>
                    <span className={`text-xs font-semibold px-3 transition-colors font-sans cursor-pointer ${considerPending ? 'text-primary' : 'text-foreground-muted hover:text-on-surface'}`} onClick={() => onTogglePending(true)}>
                        Previsto (+ Pendentes)
                    </span>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 flex flex-col min-w-0">
                    <FinancialEvolutionChart monthlyData={history} dailyData={daily} />
                </div>
                <div className="xl:col-span-1 flex flex-col gap-6 min-w-0">
                    <FinancialGoalWidget data={current} />
                    <DebtorsList debtors={debtors} />
                </div>
            </div>

            {/* Granular Breakdowns */}
            <div className="w-full">
                <BreakdownCharts
                    byLocation={analytics.byLocation}
                    byModality={analytics.byModality}
                    byPaymentType={analytics.byPaymentType}
                />
            </div>
        </section>
    );
};
