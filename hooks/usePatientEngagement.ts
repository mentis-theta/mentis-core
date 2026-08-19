import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { differenceInDays, differenceInWeeks } from 'date-fns';

export type EngagementStatus = 'alto' | 'medio' | 'baixo' | 'inativo';

export interface PatientEngagementMetrics {
    lastActivityDate: string | null;
    daysSinceLastActivity: number | null;
    status: EngagementStatus;
    totalActivitiesLast30Days: number;
    hasPortalAccess: boolean;
}

export const usePatientEngagement = (patientId: string | undefined) => {
    
    const fetchEngagement = async (): Promise<PatientEngagementMetrics> => {
        if (!patientId) throw new Error("No patient ID");

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isoThirtyDays = thirtyDaysAgo.toISOString();

        // Fazemos consultas leves apenas trazendo a data da última atividade
        const [moodRes, toolsRes, trailsRes, portalRes] = await Promise.all([
            supabase
                .from('thought_records')
                .select('created_at')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(10),
                
            supabase
                .from('clinical_records')
                .select('date')
                .eq('patient_id', patientId)
                .eq('type', 'clinical_tool')
                .order('date', { ascending: false })
                .limit(10),
                
            supabase
                .from('assignments')
                .select('assigned_at')
                .eq('patient_id', patientId)
                .eq('status', 'completed')
                .order('assigned_at', { ascending: false })
                .limit(10),
                
            supabase
                .from('portal_sessions')
                .select('id')
                .eq('patient_id', patientId)
                .limit(1)
        ]);

        const allDates: string[] = [];
        let total30Days = 0;

        if (moodRes.data) {
            allDates.push(...moodRes.data.map(d => d.created_at));
            total30Days += moodRes.data.filter(d => d.created_at >= isoThirtyDays).length;
        }
        if (toolsRes.data) {
            allDates.push(...toolsRes.data.map(d => d.date));
            total30Days += toolsRes.data.filter(d => d.date >= isoThirtyDays).length;
        }
        if (trailsRes.data) {
            allDates.push(...trailsRes.data.map(d => d.assigned_at));
            total30Days += trailsRes.data.filter(d => d.assigned_at >= isoThirtyDays).length;
        }

        const hasPortalAccess = (portalRes.data && portalRes.data.length > 0) || allDates.length > 0;

        if (allDates.length === 0) {
            return {
                lastActivityDate: null,
                daysSinceLastActivity: null,
                status: 'inativo',
                totalActivitiesLast30Days: 0,
                hasPortalAccess
            };
        }

        allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const lastActivityDate = allDates[0];
        
        const daysSinceLastActivity = differenceInDays(new Date(), new Date(lastActivityDate));

        let status: EngagementStatus = 'inativo';
        if (daysSinceLastActivity <= 7) status = 'alto';
        else if (daysSinceLastActivity <= 14) status = 'medio';
        else if (daysSinceLastActivity <= 21) status = 'baixo';

        return {
            lastActivityDate,
            daysSinceLastActivity,
            status,
            totalActivitiesLast30Days: total30Days,
            hasPortalAccess
        };
    };

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['patient_engagement', patientId],
        queryFn: fetchEngagement,
        enabled: !!patientId,
        staleTime: 1000 * 60 * 15, // Cache por 15 minutos (não precisa de real-time absoluto)
    });

    return { metrics, loading: isLoading };
};
