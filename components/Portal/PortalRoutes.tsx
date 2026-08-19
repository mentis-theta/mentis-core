import React, { useEffect } from 'react';
import PortalLayout from './PortalLayout';
import PortalLogin from './PortalLogin';
import PortalHome from './PortalHome';
import PortalSetupAuth from './PortalSetupAuth';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { hasPortalToken, getPortalToken, clearPortalToken } from '@/services/portalAuthService';

const PortalRoutes: React.FC = () => {
    const { currentUser, isLoadingAuth } = useAuth();
    const { currentPath, navigateTo } = usePortalNavigation();

    // Verification for Magic Token in local storage
    const hasMagicToken = hasPortalToken();

    // Handle Unauthenticated Redirections cleanly
    useEffect(() => {
        if (!isLoadingAuth && !currentUser && !hasMagicToken && currentPath !== '/portal/login') {
            navigateTo('/portal/login');
        }
    }, [isLoadingAuth, currentUser, hasMagicToken, currentPath, navigateTo]);

    // Handle Authenticated Redirections
    useEffect(() => {
        if (!isLoadingAuth && (currentUser || hasMagicToken) && currentPath === '/portal/login') {
            // Se já tem auth (via supabase ou token), vai pra home
            navigateTo('/portal');
        }
    }, [isLoadingAuth, currentUser, hasMagicToken, currentPath, navigateTo]);


    if (isLoadingAuth) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </PortalLayout>
        );
    }

    // Public Route: Login
    if (currentPath === '/portal/login') {
        return (
            <PortalLayout>
                <PortalLogin />
            </PortalLayout>
        );
    }

    // Protected Routes: requer autenticação ou Magic Token
    if (!currentUser && !hasMagicToken) {
        // Redirection will be handled by useEffect, meanwhile render nothing or loading
        return (
            <PortalLayout>
                <div className="flex h-screen items-center justify-center text-foreground-muted">Redirecionando...</div>
            </PortalLayout>
        );
    }

    // Router SPA (sem reload)
    if (currentPath === '/portal/biblioteca') {
        const LibraryIsland = React.lazy(() => import('./Islands/LibraryIsland'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <LibraryIsland />
                </React.Suspense>
            </PortalLayout>
        );
    }

    if (currentPath === '/portal/diario') {
        const PatientRPDPage = React.lazy(() => import('./Tools/RPD/PatientRPDPage'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <PatientRPDPage />
                </React.Suspense>
            </PortalLayout>
        );
    }

    if (currentPath === '/portal/tools/breathing' || currentPath === '/portal/ferramentas/respiracao') {
        const BreathingTool = React.lazy(() => import('./Tools/Breathing/BreathingTool').then(module => ({ default: module.BreathingTool })));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <BreathingTool />
                </React.Suspense>
            </PortalLayout>
        );
    }

    if (currentPath === '/portal/tools/coping') {
        const CopingCards = React.lazy(() => import('./Tools/CopingCards'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <CopingCards />
                </React.Suspense>
            </PortalLayout>
        );
    }

    if (currentPath === '/portal/tools/mindfulness') {
        const MindfulnessDiary = React.lazy(() => import('./Tools/MindfulnessDiary'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <MindfulnessDiary />
                </React.Suspense>
            </PortalLayout>
        );
    }

    if (currentPath === '/portal/tools/safespace') {
        const SafeSpace = React.lazy(() => import('./Tools/SafeSpace/SafeSpace'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                    <SafeSpace />
                </React.Suspense>
            </PortalLayout>
        );
    }

    // Practice Runner (Phase 21)
    if (currentPath.startsWith('/portal/pratica/')) {
        const practiceId = currentPath.replace('/portal/pratica/', '');
        const PracticeRunner = React.lazy(() => import('./PracticeRunner'));
        return (
            <PortalLayout>
                <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div></div>}>
                    <PracticeRunner practiceId={practiceId} />
                </React.Suspense>
            </PortalLayout>
        );
    }

    // Setup Auth Route (Phase 3)
    if (currentPath === '/portal/setup-auth') {
        // Extrair patientId do token no localStorage
        const magicToken = getPortalToken();
        let setupPatientId = '';
        if (magicToken) {
            setupPatientId = magicToken.patientId;
        }

        return (
            <PortalLayout>
                <PortalSetupAuth
                    patientId={setupPatientId}
                    onComplete={() => {
                        sessionStorage.setItem('mentis_auth_setup_done', 'true');
                        navigateTo('/portal');
                    }}
                    onSkip={() => {
                        sessionStorage.setItem('mentis_auth_setup_done', 'true');
                        navigateTo('/portal');
                    }}
                />
            </PortalLayout>
        );
    }

    // Default: Home
    // Check if first magic link access without PIN/biometric → redirect to setup
    if (currentPath === '/portal' || currentPath === '/portal/') {
        const isMagicAccess = !currentUser && hasMagicToken;
        const hasAuthSetup = localStorage.getItem('mentis_portal_has_pin') === 'true' ||
                             localStorage.getItem('mentis_portal_has_biometric') === 'true';
        const setupDone = sessionStorage.getItem('mentis_auth_setup_done') === 'true';

        if (isMagicAccess && !hasAuthSetup && !setupDone) {
            return (
                <PortalLayout>
                    <PortalSetupAuth
                        patientId={getPortalToken()?.patientId ?? ''}
                        onComplete={() => {
                            sessionStorage.setItem('mentis_auth_setup_done', 'true');
                            navigateTo('/portal');
                            window.location.reload();
                        }}
                        onSkip={() => {
                            sessionStorage.setItem('mentis_auth_setup_done', 'true');
                            navigateTo('/portal');
                            window.location.reload();
                        }}
                    />
                </PortalLayout>
            );
        }
    }

    // Default: Home
    return (
        <PortalLayout>
            <PortalHome />
        </PortalLayout>
    );
};

export default PortalRoutes;
