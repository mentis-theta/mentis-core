import { useState, useCallback } from 'react';

export type ModalName =
    'addPatient' | 'sessionEditor' | 'goalEditor' | 'feedbackEditor' |
    'addDocument' | 'viewNotes' | 'viewLogDetails' | 'deleteConfirmation' |
    'transferPatient' | 'appointment';

export const useAppModals = () => {
    const [modals, setModals] = useState<Record<ModalName, boolean>>({
        addPatient: false,
        sessionEditor: false,
        goalEditor: false,
        feedbackEditor: false,
        addDocument: false,
        viewNotes: false,
        viewLogDetails: false,
        deleteConfirmation: false,
        transferPatient: false,
        appointment: false
    });

    const openModal = useCallback((name: ModalName) => {
        setModals(prev => ({ ...prev, [name]: true }));
    }, []);

    const closeModal = useCallback((name: ModalName) => {
        setModals(prev => ({ ...prev, [name]: false }));
    }, []);

    const toggleModal = useCallback((name: ModalName) => {
        setModals(prev => ({ ...prev, [name]: !prev[name] }));
    }, []);

    return {
        modals,
        openModal,
        closeModal,
        toggleModal
    };
};
