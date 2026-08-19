import React from 'react';
import type { CurrentMonthMetrics } from '@/hooks/useFinancialData';
import { UserCircleIcon, ClipboardCheckIcon, ChartBarIcon } from '@/components/Icons';

interface FinancialKPIsProps {
    data: CurrentMonthMetrics;
}

export const FinancialKPIs: React.FC<FinancialKPIsProps> = ({ data }) => {
    const kpis = [
        {
            label: 'Pacientes Ativos',
            value: String(data.activePatients),
            iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            icon: <UserCircleIcon className="h-5 w-5" />,
            accent: 'from-blue-500/5 to-transparent',
        },
        {
            label: 'Sessões no Mês',
            value: String(data.totalSessions),
            iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            icon: <ClipboardCheckIcon className="h-5 w-5" />,
            accent: 'from-indigo-500/5 to-transparent',
        },
        {
            label: 'Comparecimento',
            value: `${data.attendanceRate.toFixed(0)}%`,
            iconBg: data.attendanceRate >= 80 ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : 'bg-amber-500/10 dark:bg-amber-500/20',
            iconColor: data.attendanceRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            icon: <ChartBarIcon className="h-5 w-5" />,
            accent: data.attendanceRate >= 80 ? 'from-emerald-500/5 to-transparent' : 'from-amber-500/5 to-transparent',
            valueColor: data.attendanceRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            subtitle: data.cancelRate > 0 ? `${data.cancelRate.toFixed(0)}% cancelamentos` : undefined,
        },
        {
            label: 'Ticket Médio',
            value: data.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            icon: <ChartBarIcon className="h-5 w-5" />,
            accent: 'from-emerald-500/5 to-transparent',
            valueColor: 'text-emerald-600 dark:text-emerald-400',
            subtitle: `por sessão realizada`,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
                <div
                    key={kpi.label}
                    className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md group border border-border/40"
                >
                    {/* Subtle gradient accent on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${kpi.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] text-foreground-muted uppercase font-bold tracking-wider font-sans m-0">
                                {kpi.label}
                            </p>
                            <div className={`h-9 w-9 rounded-xl ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
                                {kpi.icon}
                            </div>
                        </div>
                        <h3 className={`text-2xl font-bold tracking-tight font-sans m-0 ${kpi.valueColor || 'text-on-surface'}`}>
                            {kpi.value}
                        </h3>
                        {kpi.subtitle && (
                            <p className="text-xs text-foreground-muted mt-1.5 font-medium font-sans m-0">
                                {kpi.subtitle}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
