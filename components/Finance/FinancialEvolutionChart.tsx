import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
    AreaChart, Area
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';

interface FinancialEvolutionChartProps {
    monthlyData: any[]; // History (6 months)
    dailyData: any[];   // Daily evolution (Selected Month)
}

export const FinancialEvolutionChart: React.FC<FinancialEvolutionChartProps> = ({ monthlyData, dailyData }) => {
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

    // Determine which dataset and chart type to use
    const isDaily = viewMode === 'daily';
    const data = isDaily ? dailyData : monthlyData;

    return (
        <div className="w-full bg-surface-container-lowest p-6 sm:p-8 rounded-3xl shadow-sm border border-border/40 h-full min-h-[420px] flex flex-col transition-colors duration-200">
            {/* Header & Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <h3 className="text-xl font-semibold text-on-surface font-sans m-0 tracking-tight">
                    Evolução Financeira
                </h3>

                {/* View Toggle (M3 Pill style) */}
                <div className="flex items-center bg-surface-container-low p-1.5 rounded-full border border-border/20">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors font-sans cursor-pointer outline-none ${isDaily
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-transparent text-foreground-muted hover:text-on-surface'
                            }`}
                    >
                        Diário
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors font-sans cursor-pointer outline-none ${!isDaily
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-transparent text-foreground-muted hover:text-on-surface'
                            }`}
                    >
                        Mensal
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    {isDaily ? (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                            <XAxis
                                dataKey="fullDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'inherit' }}
                                className="text-foreground-muted font-sans"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'inherit' }}
                                className="text-foreground-muted font-sans"
                                tickFormatter={(val) => `k${val / 1000}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--surface-container-lowest))',
                                    borderColor: 'hsl(var(--border) / 0.4)',
                                    color: 'hsl(var(--foreground))',
                                    borderRadius: '16px',
                                    padding: '12px 16px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontFamily: 'inherit'
                                }}
                                itemStyle={{ fontWeight: 600 }}
                                formatter={(value: number) => [formatCurrency(value), '']}
                            />
                            <Area type="monotone" dataKey="income" name="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ec4899" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </AreaChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                            <XAxis
                                dataKey="monthLabel"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', fontSize: 12, fontFamily: 'inherit', fontWeight: 500 }}
                                className="text-foreground-muted font-sans"
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'inherit' }}
                                className="text-foreground-muted font-sans"
                                tickFormatter={(val) => `k${val / 1000}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--surface-container-lowest))',
                                    borderColor: 'hsl(var(--border) / 0.4)',
                                    color: 'hsl(var(--foreground))',
                                    borderRadius: '16px',
                                    padding: '12px 16px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontFamily: 'inherit'
                                }}
                                itemStyle={{ fontWeight: 600 }}
                                formatter={(value: number) => [formatCurrency(value), '']}
                            />
                            <ReferenceLine y={0} stroke="currentColor" className="text-border" />
                            <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                            <Bar dataKey="expenses" name="Despesa" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};
