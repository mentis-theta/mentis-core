import React, { useState, useEffect } from 'react';
import type { Patient, User } from '@/types.ts';
import InsightsDashboard from '../InsightsDashboard';
import { usePatientContext } from '@/contexts/PatientContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/services/supabaseClient.ts';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
import type { TherapeuticAllianceLog } from '@/types.ts';

interface PerformancePanelProps {
    patient: Patient;
    currentUser: User | null;
}

const PerformancePanel: React.FC<PerformancePanelProps> = ({ patient, currentUser }) => {
    const { generateInsights } = usePatientContext();
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'full_audit');

    const handleGenerateInsights = async (mode: 'summary' | 'sabatina') => {
        setIsGeneratingInsights(true);
        await generateInsights(patient, mode);
        setIsGeneratingInsights(false);
    };

    const [allianceLogs, setAllianceLogs] = useState<TherapeuticAllianceLog[]>([]);

    useEffect(() => {
        const fetchAllianceLogs = async () => {
            if (!currentUser || !patient.id) return;
            const { data } = await supabase
                .from('therapeutic_alliance_logs')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: true });
            if (data) setAllianceLogs(data);
        };
        fetchAllianceLogs();
    }, [currentUser, patient.id]);

    // Calcular Taxa de Conversão Clínica (Práticas Prescritas vs Concluídas)
    const goals = decoupledData?.goals || [];
    const allTasks = goals.flatMap(g => g.patientTasks || []);
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
    
    // Se não houver tarefas, mostra 100% vazio (ou 0%) para não quebrar o gráfico.
    const hasTasks = allTasks.length > 0;
    const completedPct = hasTasks ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    const pendingPct = hasTasks ? Math.round((pendingTasks / allTasks.length) * 100) : 100; // se não tem, mostra cinza? melhor 100% pendente? ou 0 e 0

    const conversionData = hasTasks ? [
        { name: 'Concluídas', value: completedPct, color: '#10b981' }, // Emerald-500
        { name: 'Pendentes/Ignoradas', value: pendingPct, color: '#f43f5e' } // Rose-500
    ] : [
        { name: 'Sem Práticas', value: 100, color: '#e2e8f0' } // Slate-200
    ];

    // Calcular Termômetro de Aliança com base nos logs (Lógica simples: Começa em 85%, Ruptura -15, Reparo +15, Forte +5)
    let allianceScore = 85; 
    allianceLogs.forEach(log => {
        if (log.type === 'rupture') allianceScore -= 20;
        else if (log.type === 'repair') allianceScore += 15;
        else if (log.type === 'strong') allianceScore += 5;
    });
    // Limites
    if (allianceScore > 100) allianceScore = 100;
    if (allianceScore < 0) allianceScore = 0;

    let allianceStatusText = "Vínculo Estável";
    let allianceStatusColor = "text-emerald-600 dark:text-emerald-400";
    if (allianceScore < 50) {
        allianceStatusText = "Risco de Ruptura";
        allianceStatusColor = "text-rose-600 dark:text-rose-400";
    } else if (allianceScore > 80) {
        allianceStatusText = "Vínculo Forte";
        allianceStatusColor = "text-emerald-600 dark:text-emerald-400";
    } else {
        allianceStatusText = "Atenção Necessária";
        allianceStatusColor = "text-amber-500 dark:text-amber-400";
    }

    if (isLoadingDecoupled) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Topo: Sabatina IA (Reutilizando InsightsDashboard com o toggle) */}
            <div className="animate-fadeIn">
                <InsightsDashboard
                    patient={patient}
                    onGenerate={handleGenerateInsights}
                    isLoading={isGeneratingInsights}
                />
            </div>

            {/* Grid Inferior: Métricas de Desempenho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                
                {/* Esquerda: Termômetro de Aliança Terapêutica */}
                <div className="bg-surface-container-lowest border border-border/40 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">Aliança Terapêutica</h3>
                    <p className="text-sm text-foreground-muted mb-6">Monitoramento de Rupturas e Reparações</p>
                    
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative w-full max-w-[200px] aspect-[2/1] overflow-hidden">
                            {/* Gauge Background */}
                            <div className="absolute top-0 left-0 w-full h-[200%] rounded-full border-[20px] border-surface-container-high"></div>
                            {/* Gauge Fill */}
                            <div 
                                className="absolute top-0 left-0 w-full h-[200%] rounded-full border-[20px] border-emerald-500 transition-transform duration-1000 ease-out origin-center"
                                style={{ transform: `rotate(${(allianceScore / 100) * 180 - 180}deg)`, clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}
                            ></div>
                            {/* Needle / Indicator value */}
                            <div className="absolute bottom-0 left-0 w-full flex justify-center pb-2">
                                <span className="text-3xl font-black text-on-surface">{allianceScore}%</span>
                            </div>
                        </div>
                        <p className={`mt-4 text-sm font-bold ${allianceStatusColor}`}>{allianceStatusText}</p>
                    </div>

                    <div className="mt-6 flex justify-between items-center text-xs font-bold text-foreground-muted">
                        <span>Ruptura Risco</span>
                        <span>Alinhamento Ideal</span>
                    </div>
                </div>

                {/* Direita: Taxa de Conversão Clínica */}
                <div className="bg-surface-container-lowest border border-border/40 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">Adesão Clínica</h3>
                    <p className="text-sm text-foreground-muted mb-6">Práticas Prescritas vs. Concluídas</p>
                    
                    <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={conversionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {conversionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center text for Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-on-surface">{hasTasks ? conversionData[0].value : 0}%</span>
                            <span className="text-xs font-bold text-foreground-muted uppercase">{hasTasks ? 'Conclusão' : 'Vazio'}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap justify-center gap-4">
                        {conversionData.map(item => (
                            <div key={item.name} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-xs font-bold text-foreground-muted">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PerformancePanel;
