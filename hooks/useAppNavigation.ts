import { useState, useCallback } from 'react';

export type MainView = 'patients' | 'calendar' | 'staff' | 'admin' | 'settings';

export const useAppNavigation = () => {
    const [mainView, setMainView] = useState<MainView>('patients');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isPatientListCollapsed, setIsPatientListCollapsed] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'hours' | 'organization'>('organization');

    const navigateTo = useCallback((view: MainView, tab?: 'profile' | 'hours' | 'organization') => {
        setMainView(view);
        if (view === 'settings' && tab) {
            setSettingsTab(tab);
        }
        if (view !== 'patients') {
            setSelectedPatientId(null);
        }
    }, []);

    const selectPatient = useCallback((patientId: string | null) => {
        setSelectedPatientId(patientId);
        if (patientId) {
            setMainView('patients');
        }
    }, []);

    return {
        mainView,
        settingsTab,
        selectedPatientId,
        isPatientListCollapsed,
        setIsPatientListCollapsed,
        navigateTo,
        selectPatient
    };
};
