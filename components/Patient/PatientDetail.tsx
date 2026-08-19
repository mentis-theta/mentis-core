
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JSONContent } from '@/types';
import Button from '../Button.tsx';
import {
    PlusIcon, UserCircleIcon, PrinterIcon, ArrowLeftIcon,
    DocumentIcon,
    ClipboardListIcon,
    CogIcon,
    EyeIcon
} from '../Icons';
import WhatsAppActions from './WhatsAppActions.tsx';
import { logEvent, logAccess } from '@/services/auditLogger';
import { formatDate } from '@/utils/formatters.ts';
import { generatePatientPDF } from '@/services/pdfService.ts';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { useColors } from '../Settings/ColorContext';
import { BookOpenIcon } from '../Icons'; // Added
import { BarChart2, CheckCircle2, AlertTriangle, XCircle, Shield, TrendingUp, Lock, BrainCircuit } from 'lucide-react';

import PredictiveAlerts from './PredictiveAlerts.tsx';
import EngagementBadge from './EngagementBadge.tsx';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { GranularErrorBoundary } from '../GranularErrorBoundary';
import { useCrypto } from '@/contexts/CryptoContext';

// Lazy load Modals

const AssignTrailModal = React.lazy(() => import('./Modals/AssignTrailModal.tsx').then(module => ({ default: module.AssignTrailModal })));
const PrintProntuarioModal = React.lazy(() => import('./Modals/PrintProntuarioModal.tsx').then(module => ({ default: module.PrintProntuarioModal })));

// Lazy load the 3 Main Pillars
const SessionTab = React.lazy(() => import('./Tabs/SessionTab.tsx'));
const TrackingTab = React.lazy(() => import('./Tabs/TrackingTab.tsx'));
const ClinicalToolsTab = React.lazy(() => import('./Tabs/ClinicalToolsTab.tsx'));
const ManagementTab = React.lazy(() => import('./Tabs/ManagementTab.tsx'));
const SupervisionTab = React.lazy(() => import('./Tabs/SupervisionTab.tsx'));
const MentisCopilotTab = React.lazy(() => import('./Tabs/MentisCopilotTab.tsx'));

interface PatientDetailProps {
    onBackToList?: () => void;
    canEditSessions: boolean;
    canManagePatient: boolean;
    onEditPatient?: () => void;
}

type MainTab = 'sessions' | 'tracking' | 'tools' | 'management' | 'supervision' | 'mentis';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'Sessões', icon: <DocumentIcon className="h-5 w-5" /> }, // History
    { id: 'tracking', label: 'Acompanhamento', icon: <TrendingUp className="h-5 w-5" /> }, // Tracking
    { id: 'tools', label: 'Ferramentas', icon: <ClipboardListIcon className="h-5 w-5" /> }, // Clinical Tools
    { id: 'management', label: 'Gestão', icon: <CogIcon className="h-5 w-5" /> }, // Admin/Finance
    { id: 'supervision', label: 'Supervisão', icon: <Shield className="h-5 w-5" /> }, // Supervision
    { id: 'mentis', label: 'Mentis Copilot (Lab)', icon: <BrainCircuit className="h-5 w-5" /> }, // RAG
];

const TabLoadingFallback = () => (
    <div className="flex h-64 items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-slate-300 " xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-3 text-sm text-foreground-muted ">Carregando painel...</span>
    </div>
);

const PatientDetail: React.FC<PatientDetailProps> = ({ onBackToList, canEditSessions, canManagePatient, onEditPatient }) => {
    const {
        patient,
        currentUser,
        openSessionEditor
    } = usePatientContext();

    const { colors, getColorClasses } = useColors();
    const { masterKey } = useCrypto();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // We use decoupled data for the badges now
    const { data: decoupledData } = useDecoupledData(patient?.id || '', 'full_audit');
    
    // We maintain internal state to handle the fade/slide animation smoothly
    // but the source of truth is now the URL query string.
    const urlTab = (searchParams.get('tab') as MainTab) || 'sessions';
    const [activeTab, setActiveTab] = useState<MainTab>(urlTab);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Sync URL -> Internal State (handles user clicking Back/Forward buttons)
    useEffect(() => {
        if (urlTab !== activeTab) {
            handleTabChange(urlTab, false);
        }
    }, [urlTab]);

    // ─── Tab Transition (Fade + Slide) ──────────────────────────────
    const [isTabVisible, setIsTabVisible] = useState(true);
    const prevTabRef = useRef<MainTab>(activeTab);

    const handleTabChange = (tab: MainTab, updateUrl = true) => {
        if (tab === activeTab) return;
        // Phase 1: Fade out
        setIsTabVisible(false);
        setTimeout(() => {
            setActiveTab(tab);
            if (updateUrl) {
                setSearchParams({ tab }, { replace: false });
            }
            prevTabRef.current = tab;
            // Phase 2: Fade in
            requestAnimationFrame(() => setIsTabVisible(true));
        }, 150);
    };

    useEffect(() => {
        if (patient) {
            setActiveTab('sessions');
            prevTabRef.current = 'sessions';
            setIsTabVisible(true);
            logAccess(currentUser, 'patient', patient.id, 'VIEW', { patientName: patient.name });
        }
    }, [patient?.id]);

    const handlePrint = () => {
        if (patient) {
            setShowPrintModal(true);
        }
    };

    if (!patient) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-surface transition-colors duration-200">
                <div className="h-20 w-20 rounded-2xl bg-background flex items-center justify-center mb-5">
                    <UserCircleIcon className="h-10 w-10 text-slate-300 " />
                </div>
                <h3 className="text-xl font-semibold text-foreground-muted ">Selecione um Paciente</h3>
                <p className="mt-1.5 text-sm text-foreground-muted max-w-xs">
                    Escolha um paciente da lista ao lado para ver seus detalhes.
                </p>
            </div>
        );
    }

    const { updatePatient } = usePatientContext();
    
    // Guard Clause: MasterKey Drop
    // Se perdemos a chave mestre da RAM (ex: F5) e temos um paciente, forçamos um redirect visual
    if (patient && !masterKey) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-surface transition-colors duration-200">
                <div className="h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5 animate-pulse">
                    <Lock className="h-10 w-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground-muted ">Cofre Bloqueado</h3>
                <p className="mt-2 text-sm text-foreground-muted max-w-sm mb-6">
                    A chave de criptografia de ponta a ponta foi removida da memória por segurança. 
                    Por favor, retorne ao painel e insira seu PIN para desbloquear os dados clínicos.
                </p>
                <Button onClick={() => window.location.href = '/dashboard'} variant="primary" className="!rounded-full px-6">
                    Ir para Dashboard
                </Button>
            </div>
        );
    }

    const isDischarged = patient.status === 'discharged' || !!patient.closure_date;
    const isReadOnly = isDischarged;
    const canEdit = canEditSessions && !isReadOnly;

    return (
        <div className="h-full overflow-y-auto bg-canvas transition-colors duration-200 overscroll-contain">
            <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 animate-fadeIn">

                <PredictiveAlerts patient={patient} />

                {/* --- 1. Top Bar: Identity & Actions — Clinical Card --- */}
                <div className="bg-surface-container-lowest border border-border/40 rounded-3xl p-8 shadow-sm mb-6 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">

                        {/* Identity Block */}
                        <div className="flex items-center gap-6">
                            {onBackToList && (
                                <button onClick={onBackToList} className="md:hidden text-foreground-muted hover:text-slate-600 transition-colors duration-200 p-1 rounded-xl hover:bg-slate-100">
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </button>
                            )}

                            <div className="relative flex-shrink-0">
                                {patient.photoUrl ? (
                                    <img src={patient.photoUrl} alt={patient.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-offset-2 ring-primary/10 transition-all duration-300" />
                                ) : (
                                    <div className="h-20 w-20 rounded-full bg-surface-container-low flex items-center justify-center ring-4 ring-offset-2 ring-primary/10 transition-all duration-300">
                                        <span className="text-2xl font-bold text-primary">
                                            {patient.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <span className={`absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full ring-2 ring-surface ${patient.status === 'active' ? 'bg-emerald-400' : 'bg-border'}`} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none">{patient.name}</h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    {patient.clinic_name && (
                                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full border border-border/50">
                                            {patient.clinic_name}
                                        </span>
                                    )}
                                    <span className="text-sm text-foreground-muted font-bold">Desde {formatDate(patient.createdAt)}</span>

                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isDischarged ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
                                        {isDischarged ? 'Caso Encerrado' : (patient.status === 'active' ? 'Em Acompanhamento' : patient.status)}
                                    </span>

                                    {/* Therapeutic Link Badges */}
                                    {(() => {
                                        const sessions = decoupledData?.sessions || [];
                                        const completed = sessions.filter(s => s.status === 'completed').length;
                                        const missed = sessions.filter(s => s.status === 'missed' || s.status === 'canceled').length;
                                        const total = completed + missed;
                                        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                                        if (completed === 0) return null;

                                        const badgeBase = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold";

                                        return (
                                            <>
                                                <span className={`${badgeBase} bg-background text-foreground-muted  dark:bg-slate-700  `}>
                                                    <BarChart2 className="w-3.5 h-3.5 opacity-60" /> {completed} {completed === 1 ? 'sessão' : 'sessões'}
                                                </span>
                                                <span className={`${badgeBase} ${rate >= 80 ? 'bg-background text-foreground-muted'
                                                    : rate >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                    }`}>
                                                    {rate >= 80 ? <CheckCircle2 className="w-3.5 h-3.5 opacity-60" /> : rate >= 50 ? <AlertTriangle className="w-3.5 h-3.5 opacity-60" /> : <XCircle className="w-3.5 h-3.5 opacity-60" />} {rate}% comparecimento
                                                </span>
                                                {patient.portalEnabled ? (
                                                    <EngagementBadge patientId={patient.id} className={badgeBase} />
                                                ) : (
                                                    <span className={`${badgeBase} bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400`} title="Ative o portal para medir o engajamento do paciente">
                                                        <Shield className="w-3.5 h-3.5 opacity-60" /> Portal Desativado
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Actions Block - Optimized for spacing */}
                        <div className="flex flex-col sm:flex-row md:flex-row items-center justify-end gap-4 md:flex-1 w-full md:w-auto">

                            {/* Secondary Actions Group (Condensed) */}
                            <div className="flex items-center gap-2 order-2 sm:order-1">
                                <Button
                                    onClick={() => window.open(`/portal?preview_id=${patient.id}`, '_blank')}
                                    variant="ghost"
                                    size="sm"
                                    className="!rounded-xl border border-border/60 text-on-surface hover:bg-surface-container-low hover:shadow-sm px-3 transition-all"
                                    title="Portal do Paciente"
                                >
                                    <EyeIcon className="h-4 w-4 text-primary" />
                                </Button>

                                <Button
                                    onClick={handlePrint}
                                    variant="ghost"
                                    size="sm"
                                    className="!rounded-xl border border-border/60 text-on-surface hover:bg-surface-container-low hover:shadow-sm px-3 transition-all"
                                    title="Imprimir Prontuário"
                                >
                                    <PrinterIcon className="h-4 w-4 text-primary" />
                                </Button>

                                {canEdit && (
                                    <Button
                                        onClick={() => setShowAssignModal(true)}
                                        variant="ghost"
                                        size="sm"
                                        className="!rounded-xl border border-border/60 text-on-surface hover:bg-surface-container-low hover:shadow-sm px-3 transition-all"
                                        title="Jornada do Paciente"
                                    >
                                        <BookOpenIcon className="h-4 w-4 text-primary" />
                                    </Button>
                                )}
                            </div>

                            {/* Primary Actions Group */}
                            <div className="flex items-center gap-3 order-1 sm:order-2">
                                <WhatsAppActions patient={patient} currentUser={currentUser} />

                                {canEdit && (
                                    <Button
                                        onClick={() => openSessionEditor()}
                                        size="md"
                                        className="!rounded-xl !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 hover:opacity-90 px-6 py-2 shadow-sm transition-all whitespace-nowrap"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-1.5" /> <span className="text-sm font-bold">Nova Sessão</span>
                                    </Button>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* MODALS */}
                {showAssignModal && patient && (
                    <React.Suspense fallback={null}>
                        <AssignTrailModal
                            patientId={patient.id}
                            patientName={patient.name}
                            onClose={() => setShowAssignModal(false)}
                        />
                    </React.Suspense>
                )}
                
                {showPrintModal && patient && (
                    <React.Suspense fallback={null}>
                        <PrintProntuarioModal
                            patient={patient}
                            onClose={() => setShowPrintModal(false)}
                        />
                    </React.Suspense>
                )}



                {/* Navigation */}
                <div className="mb-8">
                    <nav className="flex items-center bg-surface-container-low rounded-full p-1 border border-border/20 dark:border-white/10 shadow-sm w-fit max-w-full overflow-x-auto scrollbar-hide" aria-label="Tabs">
                        {MAIN_TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        group flex items-center py-2 px-6 rounded-full text-sm font-bold
                                        transition-all duration-300 select-none
                                        ${isActive
                                            ? tab.id === 'supervision' 
                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 shadow-sm'
                                                : tab.id === 'mentis'
                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 shadow-sm'
                                                : 'bg-surface-container-lowest shadow-sm text-primary'
                                            : 'text-foreground-muted hover:text-on-surface'
                                        }
                                    `}
                                >
                                    {tab.icon && <span className="mr-2 text-lg">{tab.icon}</span>}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* --- 3. Content Area — with Fade + Slide --- */}
                <div className={`
                    min-h-[500px]
                    transition-all duration-200 ease-out
                    ${isTabVisible
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2'
                    }
                `}>
                    <GranularErrorBoundary fallbackMessage="Erro ao carregar os dados desta aba.">
                    <Suspense fallback={<TabLoadingFallback />}>

                        {activeTab === 'sessions' && (
                            <SessionTab canEdit={canEditSessions} />
                        )}
                        {activeTab === 'tracking' && (
                            <TrackingTab patient={patient} />
                        )}
                        {activeTab === 'tools' && (
                            <ClinicalToolsTab canEdit={canEditSessions} />
                        )}
                        {activeTab === 'management' && (
                            <ManagementTab canManage={canManagePatient} onEditPatient={onEditPatient} />
                        )}
                        {activeTab === 'supervision' && (
                            <SupervisionTab />
                        )}
                        {activeTab === 'mentis' && (
                            <MentisCopilotTab />
                        )}
                    </Suspense>
                </GranularErrorBoundary>
                </div>

            </div>
        </div>
    );
};

export default PatientDetail;
