import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePatientContext } from '../contexts/PatientContext';
import { supabase } from '../services/supabaseClient';
import { Session, Expense, Invoice } from '../types';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, isSameMonth, isAfter, parseISO, isSameDay } from 'date-fns';
import { useFinancialData } from './useFinancialData';
import { useGlobalSessions } from './useGlobalSessions';

export interface DashboardMetrics {
    totalPatientsMonth: number;
    sessionsCountMonth: number;
    revenueMonth: number;
    expensesMonth: number;
    netProfitMonth: number;
    cancellationRate: number;
    defaultersCount: number;
    defaultersValue: number;
    futureIncome: number;
    patientsByGender: { name: string; value: number }[];
    patientsByAge: { name: string; value: number }[];
    financialTrend: { name: string; revenue: number; expenses: number }[];
    todaysSessions: Session[];
    upcomingBirthdays: { name: string; date: string }[];
    recentActivities: any[];
    draftSessionsCount: number;
}

export const useDashboardMetrics = () => {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext(); // Use context for patients as we have them loaded
    const { current, globalDebtors, history, isLoading: financialLoading, refresh: refreshFinance } = useFinancialData();
    const { globalSessions, isLoading: globalSessionsLoading, refetch: refetchGlobalSessions } = useGlobalSessions();
    
    const fetchRecentActivities = async () => {
        if (!currentUser) return [];

        const [resMood, resTools, resTrails] = await Promise.all([
            // 1. Humor
            supabase
                .from('thought_records')
                .select('id, patient_id, emotion, situation, automatic_thoughts, created_at')
                .order('created_at', { ascending: false })
                .limit(20),
            // 2. Ferramentas Múltiplas (RPD, etc)
            supabase
                .from('clinical_records')
                .select('id, patient_id, date, metadata, content')
                .eq('type', 'clinical_tool')
                .order('date', { ascending: false })
                .limit(20),
            // 3. Trilhas Concluídas
            supabase
                .from('assignments')
                .select('id, patient_id, assigned_at, trails(title)')
                .eq('status', 'completed')
                .order('assigned_at', { ascending: false })
                .limit(20)
        ]);

        const activities: any[] = [];

        const getPatientInfo = (id: string) => {
            const p = patients.find(patient => patient.id === id);
            return {
                patientId: id,
                patientName: p ? p.name : 'Desconhecido',
                patientInitials: p ? p.name.charAt(0).toUpperCase() : '?'
            };
        };

        // Format Mood
        if (resMood.data) {
            activities.push(...resMood.data.map(item => ({
                id: `mood_${item.id}`,
                rawDate: item.created_at,
                type: 'humor',
                ...getPatientInfo(item.patient_id),
                detail: item.emotion?.toLowerCase() || 'neutro',
                isNew: false // Could be logic based on last login
            })));
        }

        // Format Tools
        if (resTools.data) {
            activities.push(...resTools.data.map(item => {
                const toolType = item.metadata?.toolType;
                let mappedType = 'atividade';
                let detail = 'Ferramenta utilizada';

                if (toolType === 'rpd') {
                    mappedType = 'rpd';
                    detail = item.content?.situao || item.content?.situation || 'Registro de Pensamento';
                } else if (toolType === 'coping_card') {
                    detail = 'Cartão de Enfrentamento criado';
                } else if (toolType === 'mindfulness_diary') {
                    detail = 'Diário preenchido';
                } else if (toolType === 'inventory') {
                    mappedType = 'avaliacao';
                    const scaleName = item.metadata?.scaleName || 'Avaliação Psicométrica';
                    const score = item.metadata?.score ?? '--';
                    const severity = item.metadata?.severity ? ` (${item.metadata.severity})` : '';
                    const isSelfReport = item.metadata?.source === 'patient_self_report';
                    
                    detail = `${scaleName} • Score: ${score}${severity}${!isSelfReport ? ' (via Sessão)' : ''}`;
                }

                return {
                    id: `tool_${item.id}`,
                    rawDate: item.date,
                    type: mappedType,
                    ...getPatientInfo(item.patient_id),
                    detail: detail,
                    isNew: false,
                    isCritical: item.metadata?.critical_item_flagged === true
                };
            }));
        }

        // Format Trails
        if (resTrails.data) {
            activities.push(...resTrails.data.map((item: any) => ({
                id: `trail_${item.id}`,
                rawDate: item.assigned_at,
                type: 'trilha',
                ...getPatientInfo(item.patient_id),
                detail: item.trails?.title || 'Trilha',
                isNew: false
            })));
        }

        // Sort by date DESC and get Top 10
        activities.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        return activities.slice(0, 10);
    };

    const { data: recentActivities = [], isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
        queryKey: ['recent_activities', currentUser?.id, patients.length],
        queryFn: fetchRecentActivities,
        enabled: !!currentUser?.id && patients.length > 0,
        staleTime: 1000 * 60 * 5,
    });

    // 1. Memoize all sessions once (using globalSessions instead of patients.sessions)
    const allSessions = useMemo(() => {
        return globalSessions.map(s => {
            const p = patients.find(pat => pat.id === s.patientId);
            return {
                ...s,
                patientName: p?.name || 'Paciente Desconhecido',
                patientPhone: p?.phone || ''
            } as unknown as Session & { patientName: string, patientPhone: string };
        });
    }, [globalSessions, patients]);

    // 2. Granular: Today's Sessions (Critical for Agenda do Dia)
    const todaysSessions = useMemo(() => {
        const today = new Date();
        return allSessions
            .filter(s => isSameDay(parseISO(s.date), today))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [allSessions]);

    // 4. Granular: Birthdays
    const upcomingBirthdays = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysLater = new Date(todayStart);
        sevenDaysLater.setDate(todayStart.getDate() + 7);

        return patients
            .filter(p => {
                if (!p.birthDate) return false;
                const birth = parseISO(p.birthDate);
                const birthThisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
                const birthNextYear = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());

                return (birthThisYear >= todayStart && birthThisYear <= sevenDaysLater) ||
                    (birthNextYear >= todayStart && birthNextYear <= sevenDaysLater);
            })
            .map(p => ({
                name: p.name,
                date: p.birthDate || '',
            }))
            .sort((a, b) => {
                const getNextDate = (dString: string) => {
                    const bDate = parseISO(dString);
                    const next = new Date(now.getFullYear(), bDate.getMonth(), bDate.getDate());
                    if (next < todayStart) next.setFullYear(now.getFullYear() + 1);
                    return next;
                };
                return getNextDate(a.date).getTime() - getNextDate(b.date).getTime();
            });
    }, [patients]);

    const metrics = useMemo<DashboardMetrics>(() => {
        const totalPatientsMonth = patients.filter(p => p.status === 'active').length;
        const sessionsThisMonth = allSessions.filter(s => isSameMonth(parseISO(s.date), new Date()));
        const sessionsCountMonth = sessionsThisMonth.length;
        
        const canceledCount = sessionsThisMonth.filter(s => s.status === 'canceled' || s.status === 'missed').length;
        const cancellationRate = sessionsCountMonth > 0 ? Math.round((canceledCount / sessionsCountMonth) * 100) : 0;
        
        const draftSessionsCount = allSessions.filter(s => s.status === 'draft').length;
        
        const defaultersCount = globalDebtors?.length || 0;
        const defaultersValue = globalDebtors?.reduce((acc, d) => acc + d.amount, 0) || 0;
        
        const today = new Date();
        const futureIncome = allSessions
            .filter(s => isAfter(parseISO(s.date), today) && s.status !== 'canceled' && s.status !== 'missed')
            .reduce((acc, s) => acc + (Number(s.price) || 0), 0);

        return {
            totalPatientsMonth,
            sessionsCountMonth,
            revenueMonth: current?.revenue || 0,
            expensesMonth: current?.expenses || 0,
            netProfitMonth: (current?.revenue || 0) - (current?.expenses || 0),
            cancellationRate,
            defaultersCount,
            defaultersValue,
            futureIncome,
            patientsByGender: [],
            patientsByAge: [],
            financialTrend: history?.map(h => ({ name: h.monthLabel, revenue: h.revenue, expenses: h.expenses })) || [],
            todaysSessions,
            upcomingBirthdays,
            recentActivities,
            draftSessionsCount
        };
    }, [patients, allSessions, current, globalDebtors, history, todaysSessions, upcomingBirthdays, recentActivities]);

    return {
        metrics,
        refresh: () => {
            refreshFinance();
            refetchActivities();
            refetchGlobalSessions();
        },
        isLoading: activitiesLoading || financialLoading || globalSessionsLoading
    };
};
