import React, { useMemo, useCallback } from 'react';
import { useProfileOps } from '@/hooks/useProfileOps';
import { usePatientSessionOps } from '@/hooks/usePatientSessionOps';
import { useFinancialOps } from '@/hooks/useFinancialOps';
import { usePatientDocumentOps } from '@/hooks/usePatientDocumentOps';
import { usePatientGoalOps } from '@/hooks/usePatientGoalOps';
import { usePatientClinicalOps } from '@/hooks/usePatientClinicalOps';
import { PatientProvider } from '@/contexts/PatientContext';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useModalData } from '@/contexts/ModalDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useSelectedPatientId } from '@/hooks/useSelectedPatientId';
import { MESSAGES } from '@/utils/messages';
import type { Session, Goal, InterventionFeedback, Document, Anamnesis, GenogramData, SystemicMapData, Patient } from '@/types';


export const PatientContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Core Data Operations
    const profileOps = useProfileOps();
    const sessionOps = usePatientSessionOps(profileOps.modifyPatient);
    const documentOps = usePatientDocumentOps(profileOps.modifyPatient);
    const goalOps = usePatientGoalOps(profileOps.modifyPatient);
    const clinicalOps = usePatientClinicalOps(profileOps.modifyPatient);
    const financialOps = useFinancialOps();
    const patientOps = { ...profileOps, ...sessionOps, ...documentOps, ...goalOps, ...clinicalOps, ...financialOps };

    // 2. Aux Contexts
    const { currentUser } = useAuth();
    const selectedPatientId = useSelectedPatientId();

    const { openModal, closeModal } = useModals();
    const {
        setSessionToEdit, setGoalToEdit,
        setInterventionFeedbackContext, setSessionToView,
        setItemToDelete
    } = useModalData();
 const { addToast } = useToast();

    // 3. Derived State
    const selectedPatient = useMemo(() =>
        selectedPatientId ? patientOps.patients?.find((p: Patient) => p.id === selectedPatientId) || null : null,
        [selectedPatientId, patientOps.patients]
    );

    // Lazy load independent E2EE lists (sessions, goals, documents) when a patient is selected
    React.useEffect(() => {
        if (selectedPatientId && patientOps.loadPatientDetails) {
            patientOps.loadPatientDetails(selectedPatientId);
        }
    }, [selectedPatientId, patientOps.loadPatientDetails]);

    // 4. Wrapped Data Actions (Memoized Callbacks)
    const saveSession = useCallback(async (pid: string, s: Omit<Session, 'id'> | Session, f: File[]) => {
        await patientOps.saveSession(pid, s, f);
        closeModal('sessionEditor');
 addToast(MESSAGES.SESSION_SAVED, "success");
 }, [patientOps, closeModal, addToast]);

    const saveManySessions = useCallback(async (pid: string, s: (Omit<Session, 'id'> | Session)[], f: File[]) => {
        await patientOps.saveManySessions(pid, s, f);
        closeModal('sessionEditor');
 addToast(`${s.length} Sessões criadas com sucesso!`, "success");
 }, [patientOps, closeModal, addToast]);

    const deleteSession = useCallback(async (pid: string, sid: string) => {
        setItemToDelete({ type: 'session', id: sid });
        openModal('deleteConfirmation');
    }, [setItemToDelete, openModal]);

    const updateSessionStatus = useCallback(async (pid: string, sid: string, status: Session['status']) => {
        await patientOps.updateSessionStatus(pid, sid, status);
 addToast(MESSAGES.STATUS_UPDATED, "success");
 }, [patientOps, addToast]);

    const addDocument = useCallback(async (pid: string, d: Omit<Document, 'id' | 'uploadedAt' | 'url'>, f: File) => {
        await patientOps.addDocument(pid, d, f);
        closeModal('addDocument');
 addToast(MESSAGES.DOCUMENT_ADDED, "success");
 }, [patientOps, closeModal, addToast]);

    const saveGoal = useCallback(async (pid: string, g: Goal) => {
        await patientOps.saveGoal(pid, g);
        closeModal('goalEditor');
 addToast(MESSAGES.GOAL_SAVED, "success");
 }, [patientOps, closeModal, addToast]);

    const deleteGoal = useCallback(async (pid: string, gid: string) => {
        setItemToDelete({ type: 'goal', id: gid });
        openModal('deleteConfirmation');
    }, [setItemToDelete, openModal]);

    const saveInterventionFeedback = useCallback(async (pid: string, gid: string, iid: string, fb: InterventionFeedback) => {
        await patientOps.saveInterventionFeedback(pid, gid, iid, fb);
        closeModal('feedbackEditor');
 addToast(MESSAGES.FEEDBACK_SAVED, "success");
 }, [patientOps, closeModal, addToast]);

    const saveAnamnesis = useCallback(async (pid: string, d: Anamnesis) => {
        await patientOps.saveAnamnesis(pid, d);
 addToast(MESSAGES.ANAMNESIS_SAVED, "success");
 }, [patientOps, addToast]);

    const saveGenogram = useCallback(async (pid: string, d: GenogramData) => {
        await patientOps.saveGenogram(pid, d);
 addToast(MESSAGES.GENOGRAM_SAVED, "success");
 }, [patientOps, addToast]);

    const saveSystemicMap = useCallback(async (pid: string, d: SystemicMapData) => {
        await patientOps.saveSystemicMap(pid, d);
 addToast("Mapa Sistêmico salvo com sucesso!", "success");
 }, [patientOps, addToast]);

    const generateInsights = useCallback(async (p: Patient, mode?: 'summary' | 'sabatina') => {
        const ok = await patientOps.generateInsights(p, mode);
 if (ok) addToast(MESSAGES.INSIGHTS_GENERATED, "success");
 else addToast(MESSAGES.INSIGHTS_FAILED, "error");
        return ok;
 }, [patientOps, addToast]);

    const deletePatient = useCallback(async (pid: string) => {
        setItemToDelete({ type: 'patient', id: pid });
        openModal('deleteConfirmation');
    }, [setItemToDelete, openModal]);

    const restorePatient = useCallback(async (pid: string) => {
        await patientOps.restorePatient(pid);
 addToast("Paciente restaurado com sucesso!", "success");
 }, [patientOps, addToast]);

    const openSessionEditor = useCallback((s?: Session) => {
        setSessionToEdit(s || null);
        openModal('sessionEditor');
    }, [setSessionToEdit, openModal]);

    const openDocumentModal = useCallback(() => openModal('addDocument'), [openModal]);

    const openGoalEditor = useCallback((g?: Goal) => {
        setGoalToEdit(g || null);
        openModal('goalEditor');
    }, [setGoalToEdit, openModal]);

    const openFeedbackEditor = useCallback((gid: string, iid: string) => {
        const intervention = selectedPatient?.goals
            .find(g => g.id === gid)
            ?.interventions.find(i => i.id === iid);

        if (intervention) {
            setInterventionFeedbackContext({ goalId: gid, interventionId: iid, feedback: intervention.feedback });
            openModal('feedbackEditor');
        }
    }, [selectedPatient, setInterventionFeedbackContext, openModal]);

    const openViewSessionNotes = useCallback((s: Session) => {
        setSessionToView(s);
        openModal('viewNotes');
    }, [setSessionToView, openModal]);

    // 5. Construct Context Value (Stable Object)
    const contextValue = useMemo(() => {
        if (!currentUser) return null;

        return {
            ...patientOps,
            patients: patientOps.patients || [],
            patient: selectedPatient,
            currentUser,

            // Wrapped Data Actions
            saveSession,
            saveManySessions,
            deleteSession,
            updateSessionStatus,
            updateSessionPaymentStatus: financialOps.updateSessionPaymentStatus,
            addDocument,
            saveGoal,
            deleteGoal,
            saveInterventionFeedback,
            saveAnamnesis,
            saveGenogram,
            saveSystemicMap,
            generateInsights,
            deletePatient,
            restorePatient,

            // UI Actions
            openSessionEditor,
            openDocumentModal,
            openGoalEditor,
            openFeedbackEditor,
            openViewSessionNotes,

            // Exposed Execution Methods
            executeDeleteSession: async (pid: string, sid: string) => {
                await patientOps.cleanupSessionFinancials(sid, pid);
                await patientOps.deleteSession(pid, sid);
            },
            executeDeleteGoal: patientOps.deleteGoal,
            executeDeletePatient: patientOps.deletePatient,
        };
    }, [
        currentUser, patientOps, selectedPatient,
        saveSession, saveManySessions, deleteSession, updateSessionStatus,
        addDocument, saveGoal, deleteGoal, saveInterventionFeedback,
        saveAnamnesis, saveGenogram, saveSystemicMap, generateInsights,
        deletePatient, restorePatient,
        openSessionEditor, openDocumentModal, openGoalEditor,
        openFeedbackEditor, openViewSessionNotes
    ]);

    if (!contextValue) return <>{children}</>;

    return (
        <PrivacyProvider>
            <PatientProvider value={contextValue}>
                {children}

            </PatientProvider>
        </PrivacyProvider>
    );
};
