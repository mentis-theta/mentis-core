import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

interface ModalContextType {
    modals: {
        addPatient: boolean;
        sessionEditor: boolean;
        goalEditor: boolean;
        feedbackEditor: boolean;
        addDocument: boolean;
        addExpense: boolean;
        appointment: boolean;
        viewNotes: boolean;
        viewLogDetails: boolean;
        deleteConfirmation: boolean;

    };
    openModal: (modalName: keyof ModalContextType['modals']) => void;
    closeModal: (modalName: keyof ModalContextType['modals']) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [modals, setModals] = useState({
        addPatient: false,
        sessionEditor: false,
        goalEditor: false,
        feedbackEditor: false,
        addDocument: false,
        addExpense: false,
        appointment: false,
        viewNotes: false,
        viewLogDetails: false,
        deleteConfirmation: false,

    });

    const openModal = useCallback((modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: true })), []);
    const closeModal = useCallback((modalName: keyof typeof modals) => setModals(prev => ({ ...prev, [modalName]: false })), []);

    const value = useMemo(() => ({
        modals, openModal, closeModal
    }), [modals, openModal, closeModal]);

    return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModals = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModals must be used within a ModalProvider');
    return context;
};

