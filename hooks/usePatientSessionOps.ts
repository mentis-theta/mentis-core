import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Session, OccResult, BatchOccResult } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import * as auditLogService from '../services/auditLogger';
import { fileToDataURL } from '../utils/formatters.ts';
import { generateUUID } from '../utils/uuid.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext';
import { syncSessionToAvailability, deleteSessionAvailability } from '../services/bookingService.ts';
import { addMinutes } from 'date-fns';
import * as Sentry from '@sentry/react';
import { PATIENTS_QUERY_KEY } from './useProfileOps.ts';
import * as cryptoService from '../services/cryptoService.ts';
import { useCrypto } from '../contexts/CryptoContext.tsx';

export const usePatientSessionOps = (
    modifyPatient: (patientId: string, modifier: (p: Patient) => Patient) => Promise<void>
) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { masterKey } = useCrypto();

    const saveSession = useCallback(async (patientId: string, sessionData: Omit<Session, 'id'> | Session, files: File[], expectedRevision?: number, forceOverride?: boolean): Promise<{status: 'success' | 'conflict' | 'error', revision?: number, serverRevision?: number, message?: string} | void> => {
        if (!masterKey || !currentUser) return;
        
        const newAttachments = await Promise.all(
            files.map(async file => ({ name: file.name, url: await fileToDataURL(file) }))
        );

        let finalSession: Session;
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const patient = currentData.find(p => p.id === patientId);
        
        if (!patient) {
            addToast("Paciente não encontrado.", "error");
            return { status: 'error', message: 'Paciente não encontrado' };
        }

        // We fetch the current session from decoupled_data cache to merge if updating
        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const existingSession = decoupledCache?.sessions?.find((s: Session) => s.id === (sessionData as Session).id);

        if (existingSession) {
            const mergedAttachments = [...(existingSession.attachments || []), ...newAttachments];
            finalSession = { ...(sessionData as Session), attachments: mergedAttachments };
            auditLogService.logEvent(currentUser, 'update_session', { patientId, sessionId: finalSession.id });
        } else {
            finalSession = {
                ...(sessionData as Session),
                id: 'id' in sessionData ? sessionData.id : generateUUID(),
                attachments: newAttachments,
            } as Session;
            auditLogService.logEvent(currentUser, 'create_session', { patientId, sessionId: finalSession.id });
        }

        const encryptedSession = cryptoService.encryptData(finalSession, masterKey);
        
        let operationResult = null;

        if (expectedRevision !== undefined) {
            // OCC Mode via RPC
            const { data, error } = await supabase.rpc('save_session_draft_occ', {
                p_session_id: finalSession.id,
                p_patient_id: patientId,
                p_user_id: currentUser.id,
                p_expected_revision: expectedRevision,
                p_encrypted_data: encryptedSession,
                p_force_override: forceOverride || false
            });

            if (error) {
                console.error("Failed to save session via OCC RPC:", error);
                addToast("Erro ao salvar sessão.", "error");
                return { status: 'error', message: error.message };
            }

            const result = data as { status: 'success'|'conflict'|'error', revision?: number, serverRevision?: number, message?: string };
            operationResult = result;

            if (result.status === 'conflict') {
                return result; // Return early, don't invalidate cache
            }
            if (result.status === 'error') {
                addToast(result.message || "Erro ao salvar", "error");
                return result;
            }
        } else {
            // Legacy Bootstrap — explicitamente non-OCC
            // LEGACY ONLY: This path intentionally does not perform CAS.
            // It MUST NOT be used by SessionEditor or any flow that tracks draft_revision.
            const { data, error } = await supabase.rpc('bootstrap_session_legacy', {
                p_session_id: finalSession.id,
                p_patient_id: patientId,
                p_user_id: currentUser.id,
                p_encrypted_data: encryptedSession
            });

            if (error) {
                console.error("Failed to bootstrap session (legacy):", error);
                addToast("Erro ao salvar sessão no banco de dados.", "error");
                return { status: 'error', message: error.message }; 
            }
            const result: OccResult = data;
            operationResult = result;
        }

        // Synchronous invalidation to force UI refresh
        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });
        
        if (finalSession.status === 'canceled') {
            deleteSessionAvailability(finalSession.id);
        } else {
            const start = new Date(finalSession.date);
            const end = addMinutes(start, finalSession.duration);
            syncSessionToAvailability(currentUser.id, finalSession.id, start, end);
        }

        return operationResult;
    }, [currentUser, queryClient, addToast, masterKey]);

    const finalizeSessionTransactionally = useCallback(async (patientId: string, sessionData: Omit<Session, 'id'> | Session, files: File[], expectedRevision: number): Promise<{status: 'success' | 'conflict' | 'error', revision?: number, serverRevision?: number, message?: string}> => {
        if (!masterKey || !currentUser) return { status: 'error', message: 'Sem permissão' };
        
        const newAttachments = await Promise.all(
            files.map(async file => ({ name: file.name, url: await fileToDataURL(file) }))
        );

        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const patient = currentData.find(p => p.id === patientId);
        
        if (!patient) return { status: 'error', message: 'Paciente não encontrado' };

        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const existingSession = decoupledCache?.sessions?.find((s: Session) => s.id === (sessionData as Session).id);

        const finalSession: Session = {
            ...(sessionData as Session),
            id: 'id' in sessionData ? sessionData.id : generateUUID(),
            attachments: existingSession ? [...(existingSession.attachments || []), ...newAttachments] : newAttachments,
        };

        const encryptedSession = cryptoService.encryptData(finalSession, masterKey);

        // Call Transactional RPC
        const { data, error } = await supabase.rpc('finalize_session_transactional', {
            p_session_id: finalSession.id,
            p_expected_revision: expectedRevision,
            p_encrypted_data: encryptedSession
        });

        if (error) {
            console.error("Failed to finalize session via RPC:", error);
            addToast("Erro ao finalizar sessão.", "error");
            return { status: 'error', message: error.message };
        }

        const result = data as { status: 'success'|'conflict'|'error', revision?: number, serverRevision?: number, message?: string };

        if (result.status === 'success') {
            auditLogService.logEvent(currentUser, 'finalize_session', { patientId, sessionId: finalSession.id });
            queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
            queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });
            
            if (finalSession.status !== 'canceled') {
                const start = new Date(finalSession.date);
                const end = addMinutes(start, finalSession.duration);
                syncSessionToAvailability(currentUser.id, finalSession.id, start, end);
            }
        } else if (result.status === 'error') {
            addToast(result.message || "Erro ao finalizar", "error");
        }

        return result;
    }, [currentUser, queryClient, addToast, masterKey]);

    const saveManySessions = useCallback(async (patientId: string, sessions: (Omit<Session, 'id'> | Session)[], files: File[]) => {
        if (!masterKey || !currentUser) return;
        
        const newAttachments = await Promise.all(files.map(async file => ({ name: file.name, url: await fileToDataURL(file) })));
        
        const createdSessions: Session[] = sessions.map(s => {
            if ('id' in s) return { ...s, attachments: [...(s.attachments || []), ...newAttachments] } as Session;
            return { ...s, id: generateUUID(), attachments: newAttachments } as Session;
        });

        auditLogService.logEvent(currentUser, 'create_session_bulk', { patientId, count: createdSessions.length, recurrenceId: createdSessions[0].recurrenceId });

        // V1.1 E2EE: Persist to independent table and AWAIT
        const sessionsPayload = createdSessions.map(s => ({
            id: s.id,
            patient_id: patientId,
            user_id: currentUser.id,
            encrypted_data: cryptoService.encryptData(s, masterKey)
        }));
        
        const { data, error } = await supabase.rpc('save_sessions_batch_occ', {
            p_sessions: sessionsPayload
        });
        if (error) {
            console.error("Failed to batch save sessions via RPC:", error);
            addToast("Erro ao salvar múltiplas sessões.", "error");
            return;
        }
        const batchResult: BatchOccResult = data;

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });

        createdSessions.forEach(s => {
            if (s.status === 'canceled') {
                deleteSessionAvailability(s.id);
            } else {
                const start = new Date(s.date);
                const end = addMinutes(start, s.duration);
                syncSessionToAvailability(currentUser.id, s.id, start, end);
            }
        });
    }, [currentUser, queryClient, addToast, masterKey]);

    const updateSessionStatus = useCallback(async (patientId: string, sessionId: string, newStatus: Session['status']) => {
        if (!masterKey || !currentUser) return;
        
        auditLogService.logEvent(currentUser, 'update_session_status', { patientId, sessionId, newStatus });
        
        const decoupledCache = queryClient.getQueryData<any>(['decoupled_data', patientId, 'full_audit']);
        const existingSession = decoupledCache?.sessions?.find((s: Session) => s.id === sessionId);
        
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const patient = currentData.find(p => p.id === patientId);

        if (existingSession && patient) {
            // Validate draft_revision before attempting CAS
            const expectedRevision = existingSession.draft_revision;
            if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
                addToast("Não foi possível determinar a versão da sessão. Recarregue e tente novamente.", "warning");
                queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
                return;
            }

            const finalSession = { ...existingSession, status: newStatus };
            const encryptedSession = cryptoService.encryptData(finalSession, masterKey);

            const { data, error } = await supabase.rpc('update_session_status_occ', {
                p_session_id: finalSession.id,
                p_encrypted_data: encryptedSession,
                p_expected_revision: expectedRevision
            });

            if (error) {
                console.error("Failed to update session status via RPC:", error);
                addToast("Erro ao atualizar status.", "error");
                return;
            }

            const result: OccResult = data;
            if (result.status === 'conflict') {
                addToast("Conflito de versão. Recarregue e tente novamente.", "warning");
                queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
                return;
            }
            
            queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
            queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });
            
            // Financeiro movido para componente chamador, se aplicável, ou desativado auto-processamento daqui

            if (newStatus === 'canceled') {
                deleteSessionAvailability(sessionId);
                try {
                    await supabase.rpc('cancel_session_and_finance', {
                        p_session_id: sessionId,
                        p_patient_id: patientId,
                        p_psychologist_id: currentUser.id
                    });
                } catch (e) {
                    console.error("Erro na RPC de cancelamento financeiro", e);
                }
            } else {
                const start = new Date(finalSession.date);
                const end = addMinutes(start, finalSession.duration);
                syncSessionToAvailability(currentUser.id, sessionId, start, end);
            }
        }
    }, [currentUser, queryClient, addToast, masterKey]);

    const deleteSession = useCallback(async (patientId: string, sessionId: string) => {
        if (!currentUser) return;
        // Financeiro de deleção movido para cleanupSessionFinancials chamado de fora
        deleteSessionAvailability(sessionId);
        
        // V1.1 E2EE: Delete from independent table and AWAIT
        const { error } = await supabase.from('patient_sessions').delete().eq('id', sessionId);
        
        if (error) {
            console.error("Failed to delete session from DB:", error);
            addToast("Erro ao excluir sessão.", "error");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['decoupled_data', patientId] });
        queryClient.invalidateQueries({ queryKey: ['global_sessions_lightweight'] });

        auditLogService.logEvent(currentUser, 'delete_session', { patientId, sessionId });
    }, [currentUser, queryClient, addToast]);

    return useMemo(() => ({ saveSession, finalizeSessionTransactionally, saveManySessions, updateSessionStatus, deleteSession }), 
        [saveSession, finalizeSessionTransactionally, saveManySessions, updateSessionStatus, deleteSession]);
};
