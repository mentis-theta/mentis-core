import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Goal, InterventionFeedback, Session } from '../types.ts';
import * as auditLogService from '../services/auditLogger';
import { useAuth } from '../contexts/AuthContext.tsx';
import { supabase } from '../services/supabaseClient.ts';
import * as cryptoService from '../services/cryptoService.ts';
import { useCrypto } from '../contexts/CryptoContext.tsx';

export const usePatientGoalOps = (
    // kept for signature compatibility with usePatientOperations wrapper
    modifyPatient: (patientId: string, modifier: (p: Patient) => Patient) => Promise<void>
) => {
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();
    const queryClient = useQueryClient();

    const saveGoal = useCallback(async (patientId: string, goalData: Goal) => {
        if (!masterKey || !currentUser) return;
        
        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const goalExists = decoupledCache?.goals?.some((g: Goal) => g.id === goalData.id);

        if (goalExists) {
            auditLogService.logEvent(currentUser, 'update_goal', { patientId, goalId: goalData.id, goalTitle: goalData.title });
        } else {
            auditLogService.logEvent(currentUser, 'create_goal', { patientId, goalId: goalData.id, goalTitle: goalData.title });
        }
        
        const { error } = await supabase.from('patient_goals').upsert({
            id: goalData.id,
            patient_id: patientId,
            user_id: currentUser.id,
            encrypted_data: cryptoService.encryptData(goalData, masterKey)
        });

        if (error) {
            console.error("Failed to save goal to DB:", error);
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
    }, [currentUser, masterKey, queryClient]);

    const deleteGoal = useCallback(async (patientId: string, goalId: string) => {
        if (!masterKey || !currentUser) return;

        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const sessions = decoupledCache?.sessions || [];
        
        let modifiedSessions: Session[] = [];
        
        sessions.forEach((s: Session) => {
            if (s.goalIds && s.goalIds.includes(goalId)) {
                modifiedSessions.push({ ...s, goalIds: s.goalIds.filter(id => id !== goalId) });
            }
        });

        const { error } = await supabase.from('patient_goals').delete().eq('id', goalId);
        
        if (error) {
            console.error("Failed to delete goal from DB:", error);
            return;
        }

        // V1.1 E2EE: Persist modified sessions that had their goalIds stripped
        if (modifiedSessions.length > 0) {
            const sessionsToUpsert = modifiedSessions.map(s => ({
                id: s.id,
                patient_id: patientId,
                user_id: currentUser.id,
                encrypted_data: cryptoService.encryptData(s, masterKey)
            }));
            const { error: sessionError } = await supabase.from('patient_sessions').upsert(sessionsToUpsert);
            if (sessionError) console.error("Failed to update sessions after goal deletion:", sessionError);
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        auditLogService.logEvent(currentUser, 'delete_goal', { patientId, goalId });
    }, [currentUser, masterKey, queryClient]);

    const saveInterventionFeedback = useCallback(async (patientId: string, goalId: string, interventionId: string, feedback: InterventionFeedback) => {
        if (!masterKey || !currentUser) return;
        
        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const goal = decoupledCache?.goals?.find((g: Goal) => g.id === goalId);
        
        if (!goal) return;

        const finalGoal = { ...goal, interventions: goal.interventions.map((i: any) => i.id === interventionId ? { ...i, feedback } : i) };
        
        const { error } = await supabase.from('patient_goals').upsert({
            id: finalGoal.id,
            patient_id: patientId,
            user_id: currentUser.id,
            encrypted_data: cryptoService.encryptData(finalGoal, masterKey)
        });

        if (error) {
            console.error("Failed to update intervention feedback in DB:", error);
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        auditLogService.logEvent(currentUser, 'update_intervention_feedback', { patientId, goalId, interventionId });
    }, [currentUser, masterKey, queryClient]);

    return useMemo(() => ({ saveGoal, deleteGoal, saveInterventionFeedback }), [saveGoal, deleteGoal, saveInterventionFeedback]);
};
