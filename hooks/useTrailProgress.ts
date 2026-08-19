import React, { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePortalUser } from './usePortalUser';

/**
 * Hook para buscar e gerenciar o progresso do paciente nas trilhas.
 * Retorna um Set com os IDs dos steps completados para lookup O(1).
 */
export const useTrailProgress = (patientId?: string) => {
    const queryClient = useQueryClient();
    const { isSimulation } = usePortalUser();

    const fetchProgressFn = useCallback(async (): Promise<string[]> => {
        if (!patientId) return [];

        const { data, error } = await supabase
            .from('patient_progress')
            .select('step_id')
            .eq('patient_id', patientId)
            .eq('status', 'completed');

        if (error) throw error;

        return (data || []).map(row => row.step_id);
    }, [patientId]);

    const { data: completedStepIdsArray = [], isLoading } = useQuery({
        queryKey: ['trail_progress', patientId],
        queryFn: fetchProgressFn,
        enabled: !!patientId,
        staleTime: 1000 * 60 * 2, // 2 minutos — progresso muda com frequência
    });

    // Converter para Set apenas na camada de UI para manter O(1) lookup
    // Evita o bug de structural sharing do React Query com objetos não serializáveis (Sets)
    const completedStepIds = React.useMemo(() => new Set(completedStepIdsArray), [completedStepIdsArray]);

    const refreshProgress = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['trail_progress', patientId] });
        // Também recalcular XP quando o progresso mudar
        queryClient.invalidateQueries({ queryKey: ['gamification'] });
    }, [queryClient, patientId]);

    return {
        completedStepIds,
        loading: isLoading,
        isSimulation,
        refreshProgress
    };
};
