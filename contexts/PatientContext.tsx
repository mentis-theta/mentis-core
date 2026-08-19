
import React, { createContext, useContext } from 'react';
import type { Patient, User, Session, Goal, InterventionFeedback, Document, Anamnesis, GenogramData, SystemicMapData } from '../types.ts';

// Interface que define o que estará disponível no contexto
interface PatientContextType {
    patient: Patient | null;
    currentUser: User;

    // Global Data
    patients: Patient[];
    isLoadingData: boolean;
    refreshPatients: (includeArchived?: boolean) => Promise<void>;

    // CRUD Actions
    addPatient: (patientData: Omit<Patient, 'id' | 'createdAt' | 'sessions' | 'documents' | 'goals' | 'insights'>, psychologistId?: string) => Promise<string | void>;
    updatePatient: (id: string, updates: Partial<Patient>) => void;
    updateMultiplePatients: (updates: {id: string, partial: Partial<Patient>}[]) => Promise<void>;
    restorePatient: (patientId: string) => Promise<void>; // Compliance
    // deletePatient, transferPatient already exist below

    // Ações de Dados (Sessões, etc)
    saveSession: (patientId: string, sessionData: Omit<Session, 'id'> | Session, files: File[], expectedRevision?: number, forceOverride?: boolean) => Promise<{status: 'success' | 'conflict' | 'error', revision?: number, serverRevision?: number, message?: string} | void>;
    finalizeSessionTransactionally: (patientId: string, sessionData: Omit<Session, 'id'> | Session, files: File[], expectedRevision: number) => Promise<{status: 'success' | 'conflict' | 'error', revision?: number, serverRevision?: number, message?: string}>;
    saveManySessions: (patientId: string, sessions: (Omit<Session, 'id'> | Session)[], files: File[]) => Promise<void>;
    updateSessionStatus: (patientId: string, sessionId: string, status: Session['status']) => Promise<void>;
    deleteSession: (patientId: string, sessionId: string) => Promise<void>;
    updateSessionPaymentStatus: (patientId: string, sessionId: string) => Promise<void>;
    addDocument: (patientId: string, docData: Omit<Document, 'id' | 'uploadedAt' | 'url'>, file: File) => Promise<void>;
    deleteDocument: (patientId: string, documentId: string) => Promise<void>;
    saveGoal: (patientId: string, goalData: Goal) => Promise<void>;
    deleteGoal: (patientId: string, goalId: string) => Promise<void>;
    saveInterventionFeedback: (patientId: string, goalId: string, interventionId: string, feedback: InterventionFeedback) => Promise<void>;
    saveAnamnesis: (patientId: string, anamnesis: Anamnesis) => Promise<void>;
    saveGenogram: (patientId: string, genogramData: GenogramData) => Promise<void>;
    saveSystemicMap: (patientId: string, systemicMap: SystemicMapData) => Promise<void>;
    generateInsights: (patient: Patient, mode?: 'summary' | 'sabatina') => Promise<boolean>;
    deletePatient: (patientId: string) => Promise<void>;

    importData: (fileContent: string) => Promise<{ success: boolean; error?: string }>;
    reorderPatients: (orderedIds: string[]) => void;

    // Direct Execution Methods (Bypassing UI Configs)
    executeDeleteSession: (patientId: string, sessionId: string) => Promise<void>;
    executeDeleteGoal: (patientId: string, goalId: string) => Promise<void>;
    executeDeletePatient: (patientId: string) => Promise<void>;

    // Ações de UI (Modais)
    openSessionEditor: (session?: Session) => void;
    openDocumentModal: () => void;
    openGoalEditor: (goal?: Goal) => void;
    openFeedbackEditor: (goalId: string, interventionId: string) => void;
    openViewSessionNotes: (session: Session) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{
    children: React.ReactNode;
    value: PatientContextType
}> = ({ children, value }) => {
    return (
        <PatientContext.Provider value={value}>
            {children}
        </PatientContext.Provider>
    );
};

export const usePatientContext = () => {
    const context = useContext(PatientContext);
    if (!context) {
        throw new Error('usePatientContext must be used within a PatientProvider');
    }
    return context;
};
