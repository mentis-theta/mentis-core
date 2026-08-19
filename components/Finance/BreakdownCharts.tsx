import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { PieChart } from 'lucide-react';

interface BreakdownChartsProps {
    byLocation: any[];
    byModality: any[];
    byPaymentType: any[];
}

// Paleta categórica suave e clínica para os gráficos de pizza
const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#14b8a6'];

const SimpleDonut = ({ data, title, colorStart = 0 }: { data: any[], title: string, colorStart?: number }) => {
    // Empty State
    if (!data || data.length === 0 || data.every(d => d.value === 0)) {
        return (
            <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-border/40 flex flex-col items-center justify-center min-h-[280px] transition-colors duration-200">
                <PieChart className="w-10 h-10 mb-3 text-foreground-muted opacity-50" strokeWidth={1.5} />
                <h4 className="text-sm font-semibold text-foreground-muted font-sans mb-1">{title}</h4>
                <p className="text-xs text-foreground-muted/70 font-sans font-medium m-0">Nenhum dado no período</p>
            </div>
        );
    }

    // Chart State
    return (
        <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-border/40 flex flex-col h-full min-h-[280px] transition-colors duration-200">
            <h4 className="text-base font-semibold text-on-surface font-sans mb-4 tracking-tight m-0">{title}</h4>
            <div className="flex-1 min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + colorStart) % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [formatCurrency(value), '']}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--surface-container-lowest))',
                                borderColor: 'hsl(var(--border) / 0.4)',
                                color: 'hsl(var(--foreground))',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                fontFamily: 'inherit',
                                fontSize: '12px'
                            }}
                            itemStyle={{ fontWeight: 600, color: 'hsl(var(--on-surface))' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{
                                fontSize: '12px',
                                fontFamily: 'inherit',
                                color: 'hsl(var(--foreground-muted))',
                                paddingTop: '10px'
                            }}
                        />
                    </RechartsPieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const BreakdownCharts: React.FC<BreakdownChartsProps> = ({ byLocation, byModality, byPaymentType }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SimpleDonut data={byLocation} title="Receita por Local" colorStart={0} />
            <SimpleDonut data={byModality} title="Receita por Modalidade" colorStart={2} />
            <SimpleDonut data={byPaymentType} title="Receita por Pagamento" colorStart={4} />
        </div>
    );
};
