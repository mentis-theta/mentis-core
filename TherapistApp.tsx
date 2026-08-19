import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ColorProvider } from './components/Settings/ColorContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ModalProvider } from './contexts/ModalContext';
import { ModalDataProvider } from './contexts/ModalDataContext';
import { ModalSchedulingProvider } from './contexts/ModalSchedulingContext';
import { PatientContextWrapper } from './components/PatientContextWrapper';
import { MainLayout } from './components/Layout/MainLayout';
import ModalManager from './components/ModalManager';
import AuthPage from './components/AuthPage';
import SecurityOnboardingModal from './components/Onboarding/SecurityOnboardingModal';
import GlobalLoader from './components/GlobalLoader';
import { useCrypto } from './contexts/CryptoContext';

const AppRoutes = React.lazy(() => import('./components/Layout/AppRoutes'));

const ProtectedAppLogic = () => {
    const { currentUser, login, register, isLoadingAuth, refreshUsers } = useAuth();
    const { isLocked } = useCrypto();
    const [dismissedOnboarding, setDismissedOnboarding] = React.useState(false);

    if (isLoadingAuth) {
        return <GlobalLoader />;
    }

    if (!currentUser || isLocked) {
        return <Navigate to="/login" replace />;
    }

    // Gatekeeper Logic for Forced Security Onboarding
    const needsOnboarding = currentUser.role === 'psychologist' && currentUser.has_recovery_phrase === false;
    const skipCount = currentUser.recovery_skip_count || 0;
    const showOnboarding = needsOnboarding && !dismissedOnboarding && skipCount <= 3; // On the 4th (count=3), they can't skip

    return (
        <MainLayout>
            <Suspense fallback={<GlobalLoader />}>
                <AppRoutes />
            </Suspense>
            <ModalManager />
            
            {showOnboarding && (
                <SecurityOnboardingModal
                    isOpen={true}
                    skipCount={skipCount}
                    onComplete={() => {
                        refreshUsers(); // Refresh to pull the new has_recovery_phrase = true
                        setDismissedOnboarding(true);
                    }}
                    onSkip={() => {
                        refreshUsers(); // Refresh to pull the new skip_count
                        setDismissedOnboarding(true);
                    }}
                />
            )}
        </MainLayout>
    );
};

export default function TherapistApp() {
    return (
        <ColorProvider>
            <ConfirmProvider>
                <ModalProvider>
                    <ModalDataProvider>
                        <ModalSchedulingProvider>
                            <PatientContextWrapper>
                                <ProtectedAppLogic />
                            </PatientContextWrapper>
                        </ModalSchedulingProvider>
                    </ModalDataProvider>
                </ModalProvider>
            </ConfirmProvider>
        </ColorProvider>
    );
}
