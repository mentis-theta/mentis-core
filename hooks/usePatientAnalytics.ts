import { useState, useMemo, useEffect } from 'react';
import type { Patient } from '../types.ts';
import { supabase } from '@/services/supabaseClient';
import { useDecoupledData } from '@/hooks/useDecoupledData';

export const usePatientAnalytics = (patient: Patient) => {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });
    const [loading, setLoading] = useState(false);
    const [engagementData, setEngagementData] = useState<any[]>([]);
    const { data: decoupledData, isLoading: isDecoupledLoading } = useDecoupledData(patient?.id || '', 'full_audit');

    // 1. Fetch Async Engagement Data (Portal Tools)
    useEffect(() => {
        const fetchEngagement = async () => {
            if (!patient) return;
            setLoading(true);

            let query = supabase
                .from('clinical_records')
                .select('metadata, created_at')
                .eq('patient_id', patient.id);

            if (filters.startDate) {
                query = query.gte('created_at', new Date(filters.startDate).toISOString());
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                query = query.lte('created_at', endDate.toISOString());
            }

            const { data, error } = await query;

            if (data && !error) {
                const counts = {
                    'crisis_breathing': 0,
                    'crisis_safe_space': 0,
                    'mindfulness': 0,
                    'mood_diary': 0,
                };

                data.forEach(record => {
                    const toolType = record.metadata?.toolType;
                    if (toolType && Object.prototype.hasOwnProperty.call(counts, toolType)) {
                        counts[toolType as keyof typeof counts]++;
                    }
                });

                const formattedEngagement = [
                    { name: 'Respiração Guiada', fill: '#0ea5e9', value: counts['crisis_breathing'] },
                    { name: 'Lugar Seguro', fill: '#8b5cf6', value: counts['crisis_safe_space'] },
                    { name: 'Mindfulness', fill: '#10b981', value: counts['mindfulness'] },
                    { name: 'Diário de Humor', fill: '#f59e0b', value: counts['mood_diary'] },
                ];

                setEngagementData(formattedEngagement);
            }
            setLoading(false);
        };

        fetchEngagement();
    }, [patient, filters.startDate, filters.endDate]);

    // 2. Filter Sessions Logic
    const filteredSessions = useMemo(() => {
        const sessions = decoupledData?.sessions || [];
        if (!patient || sessions.length === 0) return [];
        return sessions.filter(session => {
            const sessionDate = new Date(session.date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            if (startDate && sessionDate < startDate) return false;
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
                if (sessionDate > endDate) return false;
            }
            return true;
        });
    }, [patient, filters.startDate, filters.endDate, decoupledData]);

    // 3. Tag Frequency Logic
    const tagFrequencyData = useMemo(() => {
        const tagCounts = filteredSessions.reduce<Record<string, number>>((acc, session) => {
            (session.tags || []).forEach(tag => {
                acc[tag.text] = (acc[tag.text] || 0) + 1;
            });
            return acc;
        }, {});

        return Object.entries(tagCounts)
            .map(([name, count]) => ({ name, Frequência: Number(count) }))
            .sort((a, b) => b.Frequência - a.Frequência)
            .slice(0, 10);
    }, [filteredSessions]);

    // 4. Session Frequency Logic
    const sessionFrequencyData = useMemo(() => {
        if (filteredSessions.length < 1) return [];

        const sessionCountsByMonth = filteredSessions.reduce((acc: { [key: string]: number }, session) => {
            const date = new Date(session.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {});

        const sortedMonths = Object.keys(sessionCountsByMonth).sort();

        return sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            const monthName = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

            return {
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
                Sessões: sessionCountsByMonth[monthKey],
            };
        });
    }, [filteredSessions]);

    // 5. Intervention Effectiveness Logic
    const interventionEffectivenessData = useMemo(() => {
        const counts = { effective: 0, partially_effective: 0, ineffective: 0 };
        const goals = decoupledData?.goals || [];
        goals.forEach(goal => {
            goal.interventions.forEach(intervention => {
                if (intervention.feedback) {
                    counts[intervention.feedback.effectiveness]++;
                }
            });
        });

        return [
            { name: 'Efetiva', Contagem: counts.effective, fill: '#16a34a' },
            { name: 'Parcial', Contagem: counts.partially_effective, fill: '#f59e0b' },
            { name: 'Inefetiva', Contagem: counts.ineffective, fill: '#dc2626' },
        ];
    }, [decoupledData]);
    
    const hasFeedback = interventionEffectivenessData.some(d => d.Contagem > 0);
    const hasEnoughSessions = sessionFrequencyData.length > 1;
    const hasTags = tagFrequencyData.length > 0;
    const hasEngagement = engagementData.some(d => d.value > 0);

    return {
        filters,
        setFilters,
        loading,
        data: {
            engagement: engagementData,
            tagFrequency: tagFrequencyData,
            sessionFrequency: sessionFrequencyData,
            interventionEffectiveness: interventionEffectivenessData
        },
        status: {
            hasEngagement,
            hasFeedback,
            hasEnoughSessions,
            hasTags
        }
    };
};
