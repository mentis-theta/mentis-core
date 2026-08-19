import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { SchedulingRequest, Expense } from '../types';

interface ModalSchedulingContextType {
    selectedDateForAppointment: Date | null;
    setSelectedDateForAppointment: (d: Date | null) => void;

    selectedPatientIdForAppointment: string | null;
    setSelectedPatientIdForAppointment: (id: string | null) => void;

    appointmentRequestId: string | null;
    setAppointmentRequestId: (id: string | null) => void;

    isLeadsModalOpen: boolean;
    setIsLeadsModalOpen: (isOpen: boolean) => void;

    expenseToEdit: Expense | null;
    setExpenseToEdit: (e: Expense | null) => void;

    schedulingRequestContext: SchedulingRequest | null;
    setSchedulingRequestContext: (req: SchedulingRequest | null) => void;
}

const ModalSchedulingContext = createContext<ModalSchedulingContextType | undefined>(undefined);

export const ModalSchedulingProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDateForAppointment, setSelectedDateForAppointment] = useState<Date | null>(null);
    const [selectedPatientIdForAppointment, setSelectedPatientIdForAppointment] = useState<string | null>(null);
    const [appointmentRequestId, setAppointmentRequestId] = useState<string | null>(null);
    const [isLeadsModalOpen, setIsLeadsModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [schedulingRequestContext, setSchedulingRequestContext] = useState<SchedulingRequest | null>(null);

    const value = useMemo(() => ({
        selectedDateForAppointment, setSelectedDateForAppointment,
        selectedPatientIdForAppointment, setSelectedPatientIdForAppointment,
        appointmentRequestId, setAppointmentRequestId,
        isLeadsModalOpen, setIsLeadsModalOpen,
        expenseToEdit, setExpenseToEdit,
        schedulingRequestContext, setSchedulingRequestContext
    }), [
        selectedDateForAppointment, selectedPatientIdForAppointment, appointmentRequestId,
        isLeadsModalOpen, expenseToEdit, schedulingRequestContext
    ]);

    return <ModalSchedulingContext.Provider value={value}>{children}</ModalSchedulingContext.Provider>;
};

export const useModalScheduling = () => {
    const context = useContext(ModalSchedulingContext);
    if (!context) throw new Error('useModalScheduling must be used within a ModalSchedulingProvider');
    return context;
};
