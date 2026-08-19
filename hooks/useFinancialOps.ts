import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Session } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import * as auditLogService from '../services/auditLogger';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext';
import * as Sentry from '@sentry/react';
import { PATIENTS_QUERY_KEY } from './useProfileOps.ts';
import * as cryptoService from '../services/cryptoService.ts';
import { useCrypto } from '../contexts/CryptoContext.tsx';

export const useFinancialOps = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { masterKey } = useCrypto();

    const processSessionFinancials = useCallback(async (
        session: Session,
        patient: Patient,
        userId: string
    ) => {
        try {
            const { error } = await supabase.rpc('process_session_financials', {
                p_session: session,
                p_patient_id: patient.id,
                p_user_id: userId,
                p_billing_settings: patient.billing_settings || { model: 'per_session' }
            });
            if (error) throw error;
            if (session.status === 'completed' || session.status === 'missed') {
                 addToast(`Financeiro da sessão processado com sucesso.`, 'success');
            }
        } catch (err) {
            Sentry.captureException(err, { extra: { context: "Failed to auto-generate invoice via RPC", sessionId: session.id } });
            addToast("Erro ao processar financeiro da sessão.", 'error');
        }
    }, [addToast]);

    const updateSessionPaymentStatus = useCallback(async (patientId: string, sessionId: string) => {
        if (!masterKey || !currentUser) return;
        
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const patient = currentData.find(p => p.id === patientId);
        
        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const session = decoupledCache?.sessions?.find((s: Session) => s.id === sessionId);
        
        if (!session || !patient) return;

        const newStatus: 'paid' | 'pending' = session.paymentStatus === 'paid' ? 'pending' : 'paid';
        const finalSession = { ...session, paymentStatus: newStatus };

        auditLogService.logEvent(currentUser, 'update_payment_status', { patientId, sessionId });
        
        const encryptedSession = cryptoService.encryptData(finalSession, masterKey);
        const { error } = await supabase.from('patient_sessions').upsert({
            id: finalSession.id,
            patient_id: patientId,
            user_id: currentUser.id,
            encrypted_data: encryptedSession
        });

        if (error) {
            console.error("Failed to update payment status in DB:", error);
            addToast("Erro ao atualizar status de pagamento.", "error");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });
        
        if (newStatus === 'paid') {
            try {
                await supabase.from('invoices').update({ status: 'paid' }).contains('metadata', { sessionIds: [sessionId] });
            } catch (err) {
                console.error("Error auto-paying invoice:", err);
            }
        }
    }, [masterKey, currentUser, queryClient, addToast]);

    const cleanupSessionFinancials = useCallback(async (sessionId: string, patientId: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase.rpc('cancel_session_and_finance', {
                p_session_id: sessionId,
                p_patient_id: patientId,
                p_psychologist_id: currentUser.id
            });
            if (error) throw error;
        } catch (err) { 
            Sentry.captureException(err, { extra: { context: "Failed to cleanup session financials", sessionId } }); 
        }
    }, [currentUser]);

    return {
        processSessionFinancials,
        updateSessionPaymentStatus,
        cleanupSessionFinancials
    };
};
