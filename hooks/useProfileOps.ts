import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Patient, Session, Goal, Document } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import * as cryptoService from '../services/cryptoService.ts';
import * as auditLogService from '../services/auditLogger';
import { generateUUID } from '../utils/uuid.ts';
import { useCrypto } from '../contexts/CryptoContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import * as storageService from '../services/storageService.ts';
import * as Sentry from "@sentry/react";
import { migratePatientBlobIfNeeded } from '../services/patientMigrationService';

export const PATIENTS_QUERY_KEY = 'patients_data';

export const useProfileOps = () => {
    const { masterKey } = useCrypto();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    const fetchPatients = useCallback(async () => {
        if (!currentUser || !masterKey) return [];

        const { data, error } = await supabase.from('patients').select('*');
        if (error) throw error;

        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];

        return data.map((row: any) => {
            try {
                const patientData = cryptoService.decryptData<any>(row.encrypted_data, masterKey);
                
                const hasLegacyBlob = (patientData.sessions && patientData.sessions.length > 0) || 
                                      (patientData.goals && patientData.goals.length > 0) || 
                                      (patientData.documents && patientData.documents.length > 0);

                const existingPatient = currentData.find(p => p.id === row.id);

                const finalPatient = {
                    ...patientData,
                    id: row.id,
                    displayName: row.display_name || '',
                    archived_at: row.archived_at || patientData.archived_at,
                    is_active: row.is_active !== undefined ? row.is_active : (patientData.is_active !== undefined ? patientData.is_active : true),
                    archive_reason: row.archive_reason || patientData.archive_reason,
                    sessions: [],
                    goals: [],
                    documents: []
                } as Patient;

                // Dispara migração em background sem travar a renderização inicial
                if (hasLegacyBlob) {
                    migratePatientBlobIfNeeded(finalPatient, masterKey, currentUser.id);
                }

                return finalPatient;
            } catch (e) {
                Sentry.captureException(e, { extra: { context: "Failed to decrypt patient", patientId: row.id } });
                return null;
            }
        }).filter((p: Patient | null): p is Patient => p !== null)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [currentUser, masterKey, queryClient]);

    const { data: rawPatients, isLoading: isLoadingData, refetch } = useQuery({
        queryKey: [PATIENTS_QUERY_KEY, currentUser?.id],
        queryFn: fetchPatients,
        enabled: !!currentUser?.id && !!masterKey,
        staleTime: 1000 * 60 * 10,
    });

    const loadPatientDetails = useCallback(async (patientId: string) => {
        if (!masterKey || !currentUser) return;
        
        try {
            const [sessionsRes, goalsRes, docsRes] = await Promise.all([
                supabase.from('patient_sessions').select('*').eq('patient_id', patientId),
                supabase.from('patient_goals').select('*').eq('patient_id', patientId),
                supabase.from('patient_documents').select('*').eq('patient_id', patientId)
            ]);

            const sessions = (sessionsRes.data || []).map(r => cryptoService.decryptData<Session>(r.encrypted_data, masterKey));
            const goals = (goalsRes.data || []).map(r => cryptoService.decryptData<Goal>(r.encrypted_data, masterKey));
            const documents = (docsRes.data || []).map(r => cryptoService.decryptData<Document>(r.encrypted_data, masterKey));

            // V1.1 E2EE: DO NOT REINJECT DECOUPLED DATA INTO THE GLOBAL CACHE!
            // This prevents massive RAM leaks. Components MUST use useDecoupledData() hook.
            // queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id], old => ...);
            
        } catch (e) {
            console.error("Lazy load failed:", e);
        }
    }, [masterKey, currentUser, queryClient]);

    const updatePatientData = useCallback(async (updatedPatient: Patient) => {
        if (!masterKey || !currentUser) return;
        
        // V1.1: Omit the decoupled lists so they don't bloat the blob
        const { sessions, goals, documents, ...patientToEncrypt } = updatedPatient;
        const encryptedData = cryptoService.encryptData(patientToEncrypt, masterKey);
        
        const blindIndex = cryptoService.generateBlindIndex(updatedPatient.name, masterKey);
        const updatePayload = {
            display_name: (updatedPatient as Patient & { displayName?: string }).displayName || updatedPatient.name,
            archived_at: updatedPatient.archived_at || null,
            is_active: updatedPatient.is_active !== false,
            archive_reason: updatedPatient.archive_reason || null,
            encrypted_data: encryptedData,
            blind_index_name: blindIndex
        };
        const { error } = await supabase.from('patients').update(updatePayload).eq('id', updatedPatient.id);
        if (error) throw error;
    }, [masterKey, currentUser]);

    const syncMutation = useMutation({
        mutationKey: ['sync_patient', currentUser?.id],
        mutationFn: async (updatedPatient: Patient) => {
            await updatePatientData(updatedPatient);
            return updatedPatient;
        },
        onMutate: async (updatedPatient) => {
            await queryClient.cancelQueries({ queryKey: [PATIENTS_QUERY_KEY, currentUser?.id] });
            const previousPatients = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id]);
            queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id], old =>
                old?.map(p => p.id === updatedPatient.id ? updatedPatient : p)
            );
            return { previousPatients };
        },
        onError: (err, updatedPatient, context) => {
            Sentry.captureException(err, { extra: { context: "Sync failed, restoring previous state for patient", patientId: updatedPatient.id } });
            if (context?.previousPatients) {
                const previousPatientState = context.previousPatients.find(p => p.id === updatedPatient.id);
                if (previousPatientState) {
                    queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id], old => 
                        old?.map(p => p.id === updatedPatient.id ? previousPatientState : p)
                    );
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY, currentUser?.id] });
            queryClient.invalidateQueries({ queryKey: ['financial_expenses', currentUser?.id] });
        },
    });

    const createMutation = useMutation({
        mutationKey: ['create_patient', currentUser?.id],
        mutationFn: async (newPatient: Patient) => {
            const encryptedData = cryptoService.encryptData(newPatient, masterKey!);
            const blindIndex = cryptoService.generateBlindIndex(newPatient.name, masterKey!);
            const { error } = await supabase.from('patients').insert({
                id: newPatient.id,
                user_id: currentUser!.id,
                encrypted_data: encryptedData,
                blind_index_name: blindIndex,
                display_name: (newPatient as Patient & { displayName?: string }).displayName || newPatient.name
            }).select().single();
            if (error) throw error;
            return newPatient;
        },
        onMutate: async (newPatient) => {
            await queryClient.cancelQueries({ queryKey: [PATIENTS_QUERY_KEY, currentUser?.id] });
            const previousPatients = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id]);
            queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id], (old) =>
                old ? [...old, newPatient] : [newPatient]
            );
            return { previousPatients };
        },
        onError: (err, newPatient, context) => {
            Sentry.captureException(err, { extra: { context: "Creation failed, removing optimistic patient" } });
            if (context?.previousPatients) {
                queryClient.setQueryData([PATIENTS_QUERY_KEY, currentUser?.id], context.previousPatients);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY, currentUser?.id] });
            queryClient.invalidateQueries({ queryKey: ['financial_expenses', currentUser?.id] });
        }
    });

    const patients = rawPatients ? rawPatients.filter(p => p.is_active !== false) : undefined;

    const refreshPatients = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'sessions' | 'documents' | 'goals' | 'insights'>, psychologistId?: string) => {
        if (!currentUser) throw new Error("Usuário não autenticado.");
        if (!masterKey) throw new Error("Cofre bloqueado.");
        const newPatient: Patient = {
            ...patientData,
            id: generateUUID(),
            createdAt: new Date().toISOString(),
            order: Date.now(),
            sessions: [], documents: [], goals: [], insights: [],
            psychologistId: psychologistId || currentUser.id,
        };
        const result = await createMutation.mutateAsync(newPatient);
        auditLogService.logEvent(currentUser, 'create_patient', { patientId: newPatient.id, patientName: newPatient.name });
        return result.id;
    }, [masterKey, currentUser, createMutation]);

    const modifyPatient = useCallback(async (patientId: string, modifier: (p: Patient) => Patient) => {
        if (!currentUser) return;
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const currentPatient = currentData.find(p => p.id === patientId);
        if (!currentPatient) return;
        const updatedPatient = modifier(currentPatient);
        await syncMutation.mutateAsync(updatedPatient);
    }, [currentUser, queryClient, syncMutation]);

    const deletePatient = useCallback(async (patientId: string, reason: string = 'User archived') => {
        if (!masterKey || !currentUser) return;
        await modifyPatient(patientId, p => ({ ...p, status: 'archived' as const, is_active: false, archived_at: new Date().toISOString(), archive_reason: reason }));
        auditLogService.logAccess(currentUser, 'patient', patientId, 'archive_patient', { reason });
    }, [modifyPatient, masterKey, currentUser]);

    const restorePatient = useCallback(async (patientId: string) => {
        if (!masterKey || !currentUser) return;
        await modifyPatient(patientId, p => ({ ...p, status: 'active' as const, is_active: true, archived_at: null, archive_reason: null }));
        auditLogService.logAccess(currentUser, 'patient', patientId, 'restore_patient', {});
    }, [modifyPatient, masterKey, currentUser]);

    const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
        if (!masterKey || !currentUser) return;
        await modifyPatient(id, p => ({ ...p, ...updates }));
        auditLogService.logEvent(currentUser, 'update_patient', { patientId: id, updates: Object.keys(updates) });
    }, [modifyPatient, masterKey, currentUser]);

    const updateMultiplePatients = useCallback(async (updates: {id: string, partial: Partial<Patient>}[]) => {
        if (!masterKey || !currentUser) return;
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id]) || [];
        const updateMap = new Map(updates.map(u => [u.id, u.partial]));
        const updatedPatientsData = currentData.map(p => updateMap.has(p.id) ? ({ ...p, ...updateMap.get(p.id) } as Patient) : p);
        queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id], updatedPatientsData);
        const patientsToUpdate = updatedPatientsData.filter(p => updateMap.has(p.id));
        try {
            for (const updatedPatient of patientsToUpdate) {
                await updatePatientData(updatedPatient);
            }
            auditLogService.logEvent(currentUser, 'update_multiple_patients', { count: updates.length });
        } catch (error) {
            Sentry.captureException(error, { extra: { context: "Batch update failed, rolling back" } });
            queryClient.setQueryData([PATIENTS_QUERY_KEY, currentUser.id], currentData);
            throw error;
        }
    }, [masterKey, currentUser, queryClient, updatePatientData]);

    const importData = useCallback(async (fileContent: string) => {
        if (!masterKey || !currentUser) return { success: false, error: "Cofre bloqueado." };
        try {
            const parsed = JSON.parse(fileContent);
            let patientsToImport: Patient[] = [];
            if (parsed.version === 'v1-e2ee' && parsed.encryptedData) {
                try { patientsToImport = cryptoService.decryptData<Patient[]>(parsed.encryptedData, masterKey); } catch (e) { Sentry.captureException(e); return { success: false, error: "Falha ao descriptografar." }; }
            } else if (Array.isArray(parsed)) {
                patientsToImport = storageService.migrateAndValidatePatientsData(parsed);
            } else { return { success: false, error: "Formato desconhecido." }; }
            let successCount = 0; let failCount = 0;
            for (const p of patientsToImport) {
                try {
                    const patientId = p.id || generateUUID();
                    const patientToSave = { ...p, id: patientId, psychologistId: currentUser.id };
                    const encryptedData = cryptoService.encryptData(patientToSave, masterKey);
                    const blindIndex = cryptoService.generateBlindIndex(patientToSave.name, masterKey);
                    const { error } = await supabase.from('patients').upsert({ id: patientId, user_id: currentUser.id, encrypted_data: encryptedData, blind_index_name: blindIndex });
                    if (error) throw error;
                    successCount++;
                } catch (err) { Sentry.captureException(err); failCount++; }
            }
            await refreshPatients();
            if (failCount > 0) return { success: true, error: `Importado com avisos: ${successCount} sucessos, ${failCount} falhas.` };
            return { success: true };
        } catch (error) { Sentry.captureException(error, { extra: { context: "Import failed" } }); return { success: false, error: "Erro ao processar arquivo." }; }
    }, [masterKey, currentUser, refreshPatients]);

    const setPatients = useCallback((updater: React.SetStateAction<Patient[]>) => {
        if (!currentUser) return;
        queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser.id], updater as React.SetStateAction<Patient[] | undefined>);
    }, [queryClient, currentUser]);

    const reorderPatients = useCallback((orderedIds: string[]) => {
        const currentData = queryClient.getQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id]) || [];
        const idMap = new Map(orderedIds.map((id, index) => [id, index]));
        const updated = currentData.map((p: Patient) => {
            const newIndex = idMap.get(p.id);
            return newIndex !== undefined && newIndex !== p.order ? { ...p, order: newIndex } : p;
        });
        const changed = updated.filter((p: Patient, i: number) => p.order !== currentData[i]?.order);
        queryClient.setQueryData<Patient[]>([PATIENTS_QUERY_KEY, currentUser?.id], updated);
        if (changed.length > 0) {
            Promise.all(changed.map((p: Patient) => updatePatientData(p))).catch(err => {
                Sentry.captureException(err, { extra: { context: "Failed to reorder in DB" } });
                queryClient.setQueryData([PATIENTS_QUERY_KEY, currentUser?.id], currentData);
            });
        }
    }, [queryClient, currentUser, updatePatientData]);

    return useMemo(() => ({
        patients, setPatients, isLoadingData, refreshPatients, addPatient, modifyPatient, deletePatient, updatePatient,
        updateMultiplePatients, importData, reorderPatients, restorePatient, loadPatientDetails
    }), [patients, setPatients, isLoadingData, refreshPatients, addPatient, modifyPatient, deletePatient, updatePatient,
        updateMultiplePatients, importData, reorderPatients, restorePatient, loadPatientDetails]);
};
