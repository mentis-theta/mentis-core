import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';

// Hook leve para alimentar o sino da navbar com todas as atividades recentes.
// Diferente do useDashboardMetrics, não carrega dados financeiros nem sessões.

export type CompactActivityType = 'trilha' | 'atividade' | 'humor' | 'rpd' | 'avaliacao';

export interface CompactActivity {
    id: string;
    type: CompactActivityType;
    patientId: string;
    patientName: string;
    patientInitials: string;
    detail: string;
    rawDate: string;
    isCritical?: boolean;
}

const STORAGE_KEY_PREFIX = 'mentis_activities_seen_';

const MOOD_LABELS: Record<string, string> = {
    otimo: 'Ótimo',
    bom: 'Bom',
    neutro: 'Neutro',
    ruim: 'Ruim',
    pessimo: 'Péssimo',
};

export const useRecentActivities = () => {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const storageKey = `${STORAGE_KEY_PREFIX}${currentUser?.id || ''}`;

    const [lastSeenAt, setLastSeenAt] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) return saved;
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem(storageKey);
            if (saved) setLastSeenAt(saved);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [storageKey]);

    const fetchActivities = async (): Promise<CompactActivity[]> => {
        if (!currentUser || patients.length === 0) return [];

        const getPatientInfo = (id: string) => {
            const p = patients.find(patient => patient.id === id);
            return {
                patientId: id,
                patientName: p ? p.name : 'Desconhecido',
                patientInitials: p ? p.name.charAt(0).toUpperCase() : '?',
            };
        };

        const [resMood, resTools, resTrails] = await Promise.all([
            supabase
                .from('thought_records')
                .select('id, patient_id, emotion, created_at')
                .order('created_at', { ascending: false })
                .limit(10),
            supabase
                .from('clinical_records')
                .select('id, patient_id, date, metadata, content')
                .eq('type', 'clinical_tool')
                .order('date', { ascending: false })
                .limit(10),
            supabase
                .from('assignments')
                .select('id, patient_id, assigned_at, trails(title)')
                .eq('status', 'completed')
                .order('assigned_at', { ascending: false })
                .limit(10),
        ]);

        const activities: CompactActivity[] = [];

        // Humor
        if (resMood.data) {
            activities.push(
                ...resMood.data.map((item) => ({
                    id: `mood_${item.id}`,
                    rawDate: item.created_at,
                    type: 'humor' as const,
                    ...getPatientInfo(item.patient_id),
                    detail: MOOD_LABELS[item.emotion?.toLowerCase() || 'neutro'] || item.emotion || 'Neutro',
                }))
            );
        }

        // Tools (RPD, Coping Card, Inventories, etc)
        if (resTools.data) {
            activities.push(
                ...resTools.data.map((item) => {
                    const toolType = item.metadata?.toolType;
                    let mappedType: CompactActivityType = 'atividade';
                    let detail = 'Ferramenta utilizada';
                    let isCritical = false;

                    if (toolType === 'rpd') {
                        mappedType = 'rpd';
                        detail = 'RPD preenchido';
                    } else if (toolType === 'coping_card') {
                        detail = 'Cartão de Enfrentamento';
                    } else if (toolType === 'mindfulness_diary') {
                        detail = 'Diário preenchido';
                    } else if (toolType === 'inventory') {
                        mappedType = 'avaliacao';
                        const scaleName = item.metadata?.scaleName || 'Avaliação';
                        const score = item.metadata?.score ?? '--';
                        const severity = item.metadata?.severity || '';
                        detail = `${scaleName} • ${score}${severity ? ` (${severity})` : ''}`;
                        isCritical = item.metadata?.critical_item_flagged === true;
                    }

                    return {
                        id: `tool_${item.id}`,
                        rawDate: item.date,
                        type: mappedType,
                        ...getPatientInfo(item.patient_id),
                        detail,
                        isCritical,
                    };
                })
            );
        }

        // Trilhas concluídas
        if (resTrails.data) {
            activities.push(
                ...resTrails.data.map((item: any) => ({
                    id: `trail_${item.id}`,
                    rawDate: item.assigned_at,
                    type: 'trilha' as const,
                    ...getPatientInfo(item.patient_id),
                    detail: item.trails?.title || 'Trilha concluída',
                }))
            );
        }

        activities.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        return activities.slice(0, 15);
    };

    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['navbar_recent_activities', currentUser?.id, patients.length],
        queryFn: fetchActivities,
        enabled: !!currentUser?.id && patients.length > 0,
        staleTime: 1000 * 60 * 2,
        refetchInterval: 60000,
    });

    const unreadCount = activities.filter((a) => a.rawDate > lastSeenAt).length;

    const markAllAsRead = useCallback(() => {
        const now = new Date().toISOString();
        localStorage.setItem(storageKey, now);
        setLastSeenAt(now);
        window.dispatchEvent(new Event('storage'));
    }, [storageKey]);

    return {
        activities,
        unreadCount,
        markAllAsRead,
        loading: isLoading,
    };
};
