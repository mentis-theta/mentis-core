import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Patient, Session, Goal, InterventionFeedback, AuditLog } from '../types';

interface ModalDataContextType {
    patientToEdit: Patient | null;
    setPatientToEdit: (p: Patient | null) => void;

    initialPatientData: Partial<Patient> | undefined;
    setInitialPatientData: (d: Partial<Patient> | undefined) => void;

    sessionToEdit: Session | null;
    setSessionToEdit: (s: Session | null) => void;

    sessionToView: Session | null;
    setSessionToView: (s: Session | null) => void;

    goalToEdit: Goal | null;
    setGoalToEdit: (g: Goal | null) => void;

    itemToDelete: { type: 'patient' | 'session' | 'goal', id: string, patientId?: string } | null;
    setItemToDelete: (item: { type: 'patient' | 'session' | 'goal', id: string, patientId?: string } | null) => void;

    interventionFeedbackContext: { goalId: string; interventionId: string; feedback: InterventionFeedback | null } | null;
    setInterventionFeedbackContext: (ctx: { goalId: string; interventionId: string; feedback: InterventionFeedback | null } | null) => void;

    sessionLogsToView: AuditLog[];
    setSessionLogsToView: (logs: AuditLog[]) => void;
}

const ModalDataContext = createContext<ModalDataContextType | undefined>(undefined);

export const ModalDataProvider = ({ children }: { children: ReactNode }) => {
    const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
    const [initialPatientData, setInitialPatientData] = useState<Partial<Patient> | undefined>(undefined);
    const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
    const [sessionToView, setSessionToView] = useState<Session | null>(null);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'patient' | 'session' | 'goal', id: string, patientId?: string } | null>(null);
    const [interventionFeedbackContext, setInterventionFeedbackContext] = useState<{ goalId: string; interventionId: string; feedback: InterventionFeedback | null } | null>(null);
    const [sessionLogsToView, setSessionLogsToView] = useState<AuditLog[]>([]);

    const value = useMemo(() => ({
        patientToEdit, setPatientToEdit,
        initialPatientData, setInitialPatientData,
        sessionToEdit, setSessionToEdit,
        sessionToView, setSessionToView,
        goalToEdit, setGoalToEdit,
        itemToDelete, setItemToDelete,
        interventionFeedbackContext, setInterventionFeedbackContext,
        sessionLogsToView, setSessionLogsToView
    }), [
        patientToEdit, initialPatientData, sessionToEdit, sessionToView,
        goalToEdit, itemToDelete, interventionFeedbackContext, sessionLogsToView
    ]);

    return <ModalDataContext.Provider value={value}>{children}</ModalDataContext.Provider>;
};

export const useModalData = () => {
    const context = useContext(ModalDataContext);
    if (!context) throw new Error('useModalData must be used within a ModalDataProvider');
    return context;
};
