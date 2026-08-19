import React, { useState, Suspense } from 'react';
import { usePatientContext } from '@/contexts/PatientContext';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';
import type { Patient } from '@/types';
import {
    CurrencyDollarIcon,
    UserCircleIcon,
    LightBulbIcon,
    ChartBarIcon,
    ClipboardListIcon,
    DocumentIcon
} from '@/components/Icons';

const FinancialDashboard = React.lazy(() => import('../FinancialDashboard'));
const PatientProfile = React.lazy(() => import('../PatientProfile'));
const DocumentList = React.lazy(() => import('../DocumentList'));

interface ManagementTabProps {
    canManage: boolean;
    onEditPatient?: () => void;
}

type SectionType = 'financials' | 'documents' | 'profile';

const ManagementTab: React.FC<ManagementTabProps> = ({ canManage, onEditPatient }) => {
    const {
        patient,

        deletePatient,
        generateInsights,
        updatePatient
    } = usePatientContext();

    const [activeSection, setActiveSection] = useState<SectionType>('financials');
    const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient?.id || '', 'full_audit');

    if (!patient) return null;

    if (isLoadingDecoupled) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const documents = decoupledData?.documents || [];

    const handlePatientUpdate = (updates: Partial<Patient>) => {
        updatePatient(patient.id, updates);
    };

    const sections = [
        { id: 'financials', label: 'Financeiro', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
        { id: 'documents', label: 'Documentos', icon: <DocumentIcon className="w-4 h-4" /> },
        { id: 'profile', label: 'Perfil & Configurações', icon: <UserCircleIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Sub-Navigation - MD3 Secondary Tabs Pattern */}
            <div className="animate-fadeIn mt-2">
                <div className="flex flex-wrap items-center gap-2 bg-surface-container-low/80 backdrop-blur-md rounded-3xl p-1.5 mb-8 border border-border/20 dark:border-white/10 shadow-sm transition-all duration-300">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as SectionType)}
                                className={`
                                    group flex items-center py-2 px-5 rounded-2xl text-[11px] font-black uppercase tracking-wider
                                    transition-all duration-200 select-none
                                    ${isActive
                                        ? 'bg-primary/20 text-primary shadow-sm ring-1 ring-primary/40'
                                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-container-high'
                                    }
                                `}
                            >
                                <span className={`mr-2.5 transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : 'opacity-60 group-hover:opacity-100 group-hover:scale-105'}`}>
                                    {section.icon}
                                </span>
                                {section.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] animate-fadeIn">
                <Suspense fallback={<div className="p-8 text-center text-foreground-muted ">Carregando painel...</div>}>
                    {activeSection === 'financials' && (
                        <FinancialDashboard patient={patient} />
                    )}
                    {activeSection === 'documents' && (
                        <DocumentList
                            documents={documents}
                            canEdit={canManage}
                            onAddDocument={() => { }} // Will be handled by DocumentList internally
                            patient={patient}
                        />
                    )}
                    {activeSection === 'profile' && (
                        <PatientProfile
                            patient={patient}
                            canManage={canManage}

                            onDeletePatient={() => deletePatient(patient.id)}
                            onEditPatient={onEditPatient}
                            onPatientUpdate={handlePatientUpdate}
                        />
                    )}
                </Suspense>
            </div>
        </div>
    );
};

export default ManagementTab;
