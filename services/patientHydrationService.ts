import { supabase } from './supabaseClient';
import * as cryptoService from './cryptoService';
import { Session, Goal, Document } from '../types';
import * as Sentry from '@sentry/react';
import { showGlobalToast } from '../contexts/ToastContext.tsx';

export type HydrationDepth = 'summary' | 'clinical_evolution' | 'full_audit';

export const HYDRATION_LIMITS: Record<HydrationDepth, number> = {
    summary: 3,
    clinical_evolution: 12,
    full_audit: 9999
};

export interface HydratedData {
    sessions: Session[];
    goals: Goal[];
    documents: Document[];
}

export const hydratePatientData = async (
    patientId: string, 
    masterKey: string, 
    depth: HydrationDepth = 'summary'
): Promise<HydratedData> => {
    if (!masterKey || !patientId) return { sessions: [], goals: [], documents: [] };

    const limit = HYDRATION_LIMITS[depth];

    try {
        const [sessionsRes, goalsRes, docsRes] = await Promise.all([
            supabase.from('patient_sessions')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(limit),
            supabase.from('patient_goals')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(limit), // Goals are usually few, but limit is safe
            supabase.from('patient_documents')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(limit)
        ]);

        const sessions = (sessionsRes.data || []).map(r => {
            try { 
                const decrypted = cryptoService.decryptData<Session>(r.encrypted_data, masterKey); 
                return {
                    ...decrypted,
                    id: r.id, // Ensure ID matches row
                    draft_revision: r.draft_revision, // Inject OCC tracker
                    is_finalized: r.is_finalized
                } as Session;
            } catch { 
                return null; 
            }
        }).filter((s): s is Session => s !== null).reverse(); // Reverse back to chronological order (oldest first)

        const goals = (goalsRes.data || []).map(r => {
            try { return cryptoService.decryptData<Goal>(r.encrypted_data, masterKey); } catch { return null; }
        }).filter((g): g is Goal => g !== null).reverse();

        const documents = (docsRes.data || []).map(r => {
            try { return cryptoService.decryptData<Document>(r.encrypted_data, masterKey); } catch { return null; }
        }).filter((d): d is Document => d !== null).reverse();

        return { sessions, goals, documents };
    } catch (e) {
        console.error("Hydration Service Error:", e);
        showGlobalToast('Falha ao descriptografar ou carregar dados do paciente. Verifique sua Chave Mestra.', 'error');
        Sentry.captureException(e, { extra: { context: 'hydratePatientData', patientId, depth } });
        return { sessions: [], goals: [], documents: [] };
    }
};
