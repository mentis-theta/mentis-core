
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import InstallModal from '../InstallModal';
import RecoveryKitModal from '../RecoveryKitModal';
import { usePWA } from '@/hooks/usePWA';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import NeuralBackground from '../ui/NeuralBackground';
import AppTour from '../AppTour';

import type { SchedulingRequest, Patient } from '@/types';
import { useModals } from '@/contexts/ModalContext';
import { useModalData } from '@/contexts/ModalDataContext';
import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { usePatientContext } from '@/contexts/PatientContext';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { theme, toggleTheme } = useTheme();
    const { isAppInstalled, showInstallModal, setShowInstallModal, handleInstallClick } = usePWA();
    const { currentUser, recoveryKey, clearRecoveryKey } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Novas importações de Contexto garantido dentro da Arvore Provider
    const { openModal } = useModals();
    const { setInitialPatientData } = useModalData();
    const { setSelectedDateForAppointment, setSelectedPatientIdForAppointment, setAppointmentRequestId } = useModalScheduling();
    const { patients } = usePatientContext();

    const handleApproveLead = (req: SchedulingRequest) => {
        const normalizedCpf = req.patientCpf?.replace(/\D/g, '') || '';
        const patient = patients.find((p: Patient) => {
            const pCpf = p.cpf?.replace(/\D/g, '');
            return (pCpf && pCpf === normalizedCpf) || p.email === req.patientEmail;
        });

        if (patient) {
            setSelectedPatientIdForAppointment(patient.id);
            setSelectedDateForAppointment(new Date(req.requestedTime));
            setAppointmentRequestId(req.id);
            openModal('appointment');
        } else {
            setAppointmentRequestId(req.id);
            setSelectedDateForAppointment(new Date(req.requestedTime));

            setInitialPatientData({
                name: req.patientName,
                phone: req.patientPhone,
                email: req.patientEmail,
                medicalHistory: req.notes,
                cpf: req.patientCpf,
                birthDate: req.patientBirthDate
            });
            openModal('addPatient');
        }
    };

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="h-[100dvh] flex flex-col bg-canvas transition-colors duration-200 relative overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <NeuralBackground />
            </div>
            <Header
                toggleTheme={toggleTheme}
                theme={theme}
                isInstalled={isAppInstalled}
                onInstallClick={handleInstallClick}
                onOpenLeads={handleApproveLead}
                onOpenSettings={(tab) => {
                    setIsMobileMenuOpen(false);
                    navigate(`/settings?tab=${tab}`);
                }}
                onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />

            <div className="flex flex-1 overflow-hidden relative flex-row">
                {/* Mobile Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                <Sidebar
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />

                {/* Main Content — "Clinical Sheet" with Fade In Up via React Key */}
                <main 
                    key={location.pathname}
                    className="
                        flex-1 overflow-hidden relative
                        z-10 w-full
                        md:rounded-tl-3xl
                        md:border-t md:border-l border-border/40   
                        animate-fadeIn
                    "
                >
                    {children}
                </main>
            </div>

            <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />

            <RecoveryKitModal
                isOpen={!!recoveryKey}
                onClose={clearRecoveryKey}
                masterKey={recoveryKey || ''}
                userEmail={currentUser?.email || ''}
            />
            
            <AppTour />
        </div>
    );
};
