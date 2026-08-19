import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShieldAlert, SmilePlus, Smile, Meh, Frown, Activity, Wind, Sparkles } from 'lucide-react';

interface DailyMonitoringTabProps {
    patientId: string;
}

type TimelineEvent = {
    id: string;
    date: Date;
    type: 'mood' | 'mindfulness' | 'crisis_breathing' | 'crisis_audio';
    title: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
};

const getMoodIcon = (emotion: string) => {
    switch (emotion) {
        case 'Radical': return <SmilePlus className="w-5 h-5" />;
        case 'Bem': return <Smile className="w-5 h-5" />;
        case 'Mal': return <Frown className="w-5 h-5" />;
        case 'Horrível': return <Frown className="w-5 h-5 opacity-80" />;
        default: return <Meh className="w-5 h-5" />;
    }
};

const DailyMonitoringTab: React.FC<DailyMonitoringTabProps> = ({ patientId }) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTelemetry = async () => {
            setLoading(true);
            try {
                // 1. Fetch Moods
                const { data: moodData } = await supabase
                    .from('thought_records')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('created_at', { ascending: false });

                // 2. Fetch Clinical Records (Mindfulness & Crisis)
                const { data: clinicalData } = await supabase
                    .from('clinical_records')
                    .select('*')
                    .eq('patient_id', patientId)
                    .eq('type', 'clinical_tool')
                    .in('metadata->>toolType', ['mindfulness_diary', 'crisis_regulation']);

                const timeline: TimelineEvent[] = [];

                if (moodData) {
                    moodData.forEach(m => {
                        timeline.push({
                            id: `mood_${m.id}`,
                            date: parseISO(m.created_at),
                            type: 'mood',
                            title: `Humor: ${m.emotion}`,
                            description: m.situation || 'Sem detalhes',
                            icon: getMoodIcon(m.emotion),
                            colorClass: 'text-orange-500',
                            bgClass: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                        });
                    });
                }

                if (clinicalData) {
                    clinicalData.forEach(c => {
                        const toolType = c.metadata?.toolType;
                        
                        if (toolType === 'mindfulness_diary') {
                            timeline.push({
                                id: `mind_${c.id}`,
                                date: parseISO(c.date),
                                type: 'mindfulness',
                                title: 'Diário de Mindfulness',
                                description: `Alinhamento de valores: ${c.content?.valuesAlignment}/5. Notas: ${c.content?.notes || 'Nenhuma'}`,
                                icon: <Sparkles className="w-5 h-5" />,
                                colorClass: 'text-indigo-500',
                                bgClass: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
                            });
                        } else if (toolType === 'crisis_regulation') {
                            const isBreathing = c.content?.toolName === 'breathing';
                            timeline.push({
                                id: `crisis_${c.id}`,
                                date: parseISO(c.date),
                                type: isBreathing ? 'crisis_breathing' : 'crisis_audio',
                                title: isBreathing ? 'Respiração Guiada (Crise)' : 'Lugar Seguro (Áudio)',
                                description: c.content?.details || 'Uso da ferramenta de regulação',
                                icon: isBreathing ? <Wind className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />,
                                colorClass: isBreathing ? 'text-teal-500' : 'text-cyan-500',
                                bgClass: isBreathing 
                                    ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30'
                                    : 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'
                            });
                        }
                    });
                }

                // Sort Descending
                timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
                setEvents(timeline);

            } catch (error) {
                console.error("Error fetching telemetry:", error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchTelemetry();
        }
    }, [patientId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border border-dashed rounded-3xl">
                <Activity className="w-12 h-12 text-foreground-muted opacity-50 mb-4" />
                <h3 className="text-lg font-bold text-on-surface">Nenhum Registro</h3>
                <p className="text-foreground-muted text-sm mt-1 max-w-md text-center">
                    O paciente ainda não utilizou o portal para registrar o humor, mindfulness ou ferramentas de regulação.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto py-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-3">
                    <Activity className="text-primary" />
                    Monitoramento Diário
                </h2>
                <p className="text-foreground-muted text-sm mt-1">
                    Linha do tempo consolidada de registros de humor, práticas e regulação de crise feitos pelo paciente no Portal.
                </p>
            </div>

            <div className="relative border-l-2 border-border/50 ml-4 md:ml-6 space-y-8 pb-12">
                {events.map((event) => (
                    <div key={event.id} className="relative pl-8 md:pl-10">
                        {/* Dot */}
                        <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-surface bg-current ${event.colorClass}`} />
                        
                        {/* Card */}
                        <div className={`p-5 rounded-2xl border ${event.bgClass} shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1 duration-300`}>
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full bg-surface shadow-sm ${event.colorClass}`}>
                                        {event.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-on-surface">{event.title}</h4>
                                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                                            {format(event.date, "dd 'de' MMM • HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailyMonitoringTab;
