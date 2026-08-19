import { useCallback, useMemo } from 'react';
import type { Patient, Anamnesis, GenogramData, SystemicMapData, StoredClinicalInsight } from '../types.ts';
import * as auditLogService from '../services/auditLogger';
import * as geminiService from '../services/geminiService.ts';
import { generateUUID } from '../utils/uuid.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useCrypto } from '../contexts/CryptoContext.tsx';

export const usePatientClinicalOps = (
    modifyPatient: (patientId: string, modifier: (p: Patient) => Patient) => Promise<void>
) => {
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();

    const saveAnamnesis = useCallback(async (patientId: string, anamnesis: Anamnesis) => {
        await modifyPatient(patientId, p => ({
            ...p,
            anamnesis,
            medicalHistory: anamnesis.medicalPsychiatricHistory || p.medicalHistory
        }));
        auditLogService.logEvent(currentUser, 'update_anamnesis', { patientId });
    }, [modifyPatient, currentUser]);

    const saveGenogram = useCallback(async (patientId: string, genogramData: GenogramData) => {
        await modifyPatient(patientId, p => ({ ...p, genogramData }));
        auditLogService.logEvent(currentUser, 'update_genogram', { patientId });
    }, [modifyPatient, currentUser]);

    const saveSystemicMap = useCallback(async (patientId: string, systemicMap: SystemicMapData) => {
        await modifyPatient(patientId, p => ({ ...p, systemicMap }));
        auditLogService.logEvent(currentUser, 'update_systemic_map', { patientId });
    }, [modifyPatient, currentUser]);

    const generateInsights = useCallback(async (patient: Patient, mode: 'summary' | 'sabatina' = 'summary') => {
        auditLogService.logEvent(currentUser, 'generate_insights', { patientId: patient.id, patientName: patient.name, mode });
        const result = await geminiService.generateClinicalInsights(patient, masterKey!, mode);
        if (result) {
            const { insight, analyzedSessionIds } = result;
            const newInsight: StoredClinicalInsight = {
                ...insight,
                id: generateUUID(),
                createdAt: new Date().toISOString(),
                analyzedSessionIds: analyzedSessionIds,
                mode: mode
            } as any;
            modifyPatient(patient.id, p => ({ ...p, insights: [newInsight, ...p.insights] }));
            return true;
        }
        return false;
    }, [modifyPatient, currentUser, masterKey]);

    return useMemo(() => ({ saveAnamnesis, saveGenogram, saveSystemicMap, generateInsights }), [saveAnamnesis, saveGenogram, saveSystemicMap, generateInsights]);
};
