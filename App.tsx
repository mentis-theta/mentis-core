import React, { Suspense } from 'react';
import PublicBookingPage from './components/PublicScheduling/PublicBookingPage';

import TermsOfUse from './src/pages/Legal/TermsOfUse';
import PrivacyPolicy from './src/pages/Legal/PrivacyPolicy';

// Contexts
import { CryptoProvider } from './contexts/CryptoContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from '@/hooks/useTheme';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import GlobalLoader from './components/GlobalLoader';

import { Routes, Route, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import AuthPage from './components/AuthPage';

const PortalRoutes = React.lazy(() => import('./components/Portal/PortalRoutes'));
const PublicAssessmentPage = React.lazy(() => import('./components/PublicAssessment/PublicAssessmentPage'));
const TherapistApp = React.lazy(() => import('./TherapistApp'));

const UpdatePassword = React.lazy(() => import('./components/Auth/UpdatePassword'));
const ForgotPassword = React.lazy(() => import('./components/Auth/ForgotPassword'));
const DocumentVerificationPage = React.lazy(() => import('./components/Verification/DocumentVerificationPage'));

import { useCrypto } from './contexts/CryptoContext';

const LoginRoute = () => {
    const { currentUser, login, register } = useAuth();
    const { isLocked } = useCrypto();
    
    if (currentUser && !isLocked) {
        return <Navigate to="/dashboard" replace />;
    }
    return <AuthPage onLogin={login} onRegister={register} />;
};

const BookingRoute = () => {
    const { schedule_uid } = useParams();
    if (!schedule_uid) return <div>Professional não encontrado.</div>;
    return <PublicBookingPage psychologistId={schedule_uid} />;
};

const RootHandler = () => {
    const [searchParams] = useSearchParams();
    const scheduleUid = searchParams.get('schedule_uid');

    // Bypass: renderiza página pública se schedule_uid estiver na query string
    if (scheduleUid) {
        return <PublicBookingPage psychologistId={scheduleUid} />;
    }

    return <Navigate to="/login" replace />;
};

const AppOrSlugRouter = () => {
    const location = useLocation();
    
    // Check if the current path matches any of the internal app routes
    const isAppRoute = [
        '/', '/login', '/dashboard', '/patients', '/financial', 
        '/settings', '/calendar', '/library', '/admin', '/staff',
        '/financeiro', '/configuracoes', '/agenda'
    ].some(route => location.pathname === route || location.pathname.startsWith(`${route}/`));
    
    if (isAppRoute) {
        return (
            <Suspense fallback={<GlobalLoader />}>
                <TherapistApp />
            </Suspense>
        );
    }
    
    // Otherwise it's a bio link
    return (
        <Suspense fallback={<GlobalLoader />}>
            <PublicBookingPage psychologistId={location.pathname.split('/')[1] || ''} />
        </Suspense>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <CryptoProvider>
                <ToastProvider>
                    <AuthProvider>
                        <Routes>
                            <Route path="/" element={<RootHandler />} />
                            <Route path="/portal/*" element={
                                <GlobalErrorBoundary>
                                    <Suspense fallback={<GlobalLoader />}>
                                        <PortalRoutes />
                                    </Suspense>
                                </GlobalErrorBoundary>
                            } />
                            <Route path="/book/:schedule_uid" element={<BookingRoute />} />
                            <Route path="/login" element={<LoginRoute />} />
                            <Route path="/update-password" element={
                                <Suspense fallback={<GlobalLoader />}>
                                    <UpdatePassword />
                                </Suspense>
                            } />
                            <Route path="/forgot-password" element={
                                <Suspense fallback={<GlobalLoader />}>
                                    <ForgotPassword />
                                </Suspense>
                            } />
                            <Route path="/avaliacao/:token" element={
                                <Suspense fallback={<GlobalLoader />}>
                                    <PublicAssessmentPage />
                                </Suspense>
                            } />
                            <Route path="/termos" element={<TermsOfUse />} />
                            <Route path="/privacidade" element={<PrivacyPolicy />} />
                            <Route path="/verify/:id" element={
                                <Suspense fallback={<GlobalLoader />}>
                                    <DocumentVerificationPage />
                                </Suspense>
                            } />
                            
                            {/* Unified Application / Public Bio Router */}
                            <Route path="/*" element={<AppOrSlugRouter />} />
                        </Routes>
                    </AuthProvider>
                </ToastProvider>
            </CryptoProvider>
        </ThemeProvider>
    );
}
