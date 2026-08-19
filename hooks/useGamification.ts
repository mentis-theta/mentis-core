import { supabase } from '@/services/supabaseClient';
import { usePortalUser } from './usePortalUser';
import type { GamificationState } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useGamification = () => {
    const { patient, isSimulation } = usePortalUser();
    const queryClient = useQueryClient();

    const fetchGamificationFn = async (): Promise<GamificationState> => {
        if (!patient) throw new Error("No patient");

        // Count RPDs
        const { count: rpdCount, error } = await supabase
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', patient.id)
            .eq('type', 'clinical_tool')
            .contains('metadata', { toolType: 'rpd' });

        if (error) throw error;

        const count = rpdCount || 0;
        const xp = count * 15;

        // Level = Math.floor(Total XP / 100) + 1
        const level = Math.floor(xp / 100) + 1;
        const progressPercent = xp % 100;

        return {
            level,
            currentXP: xp,
            nextLevelXP: (Math.floor(xp / 100) + 1) * 100,
            progressPercent,
            streakDays: 0
        };
    };

    const { data: gamification = { level: 1, currentXP: 0, nextLevelXP: 100, progressPercent: 0, streakDays: 0 }, isLoading } = useQuery({
        queryKey: ['gamification', patient?.id],
        queryFn: fetchGamificationFn,
        enabled: !!patient?.id,
        staleTime: 1000 * 60 * 5,
    });

    const addXP = async (amount: number) => {
        // Atualização otimista imediata (visual) — funciona tanto em simulação quanto real
        queryClient.setQueryData<GamificationState>(['gamification', patient?.id], (old) => {
            if (!old) return old;
            const newXP = old.currentXP + amount;
            return {
                ...old,
                currentXP: newXP,
                level: Math.floor(newXP / 100) + 1,
                nextLevelXP: (Math.floor(newXP / 100) + 1) * 100,
                progressPercent: newXP % 100
            };
        });

        // Persistência real — SOMENTE para paciente real, nunca em simulação
        if (!isSimulation && patient?.id) {
            // Recalcular do banco para garantir consistência
            queryClient.invalidateQueries({ queryKey: ['gamification', patient.id] });
        }
    };

    return {
        gamification,
        loading: isLoading,
        isSimulation,
        refresh: () => queryClient.invalidateQueries({ queryKey: ['gamification', patient?.id] }),
        addXP
    };
};
