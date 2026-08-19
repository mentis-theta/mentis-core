import React, { useState, Suspense } from 'react';
import { usePatientContext } from '@/contexts/PatientContext';
import {
    ClipboardListIcon,
    UserGroupIcon,
    GlobeIcon,
    DocumentIcon
} from '@/components/Icons';
import { BrainCircuit, Activity } from 'lucide-react';

// Lazy load heavy tool components
const AnamnesisTab = React.lazy(() => import('../AnamnesisTab'));
const GenogramTab = React.lazy(() => import('../GenogramTab'));
const SystemicMapTab = React.lazy(() => import('./SystemicMap/SystemicMapTab'));
const TreatmentPlanTab = React.lazy(() => import('./TreatmentPlanTab'));
const RPDTab = React.lazy(() => import('../../Tools/RPD/RPDTab')); // Adjusted path
const EMDRTab = React.lazy(() => import('../../Tools/EMDR/EMDRTab'));
const AssessmentsHub = React.lazy(() => import('../../Tools/Assessments/AssessmentsHub'));
const ACTMatrixTab = React.lazy(() => import('../../Tools/ACT/ACTMatrixTab'));
const CopingCardsTab = React.lazy(() => import('../../Tools/Coping/CopingCardsTab'));

interface ClinicalToolsTabProps {
    canEdit: boolean;
}

type ToolType = 'anamnesis' | 'genogram' | 'systemicMap' | 'treatmentPlan' | 'rpd' | 'emdr' | 'inventories' | 'act_matrix' | 'coping';

const ClinicalToolsTab: React.FC<ClinicalToolsTabProps> = ({ canEdit }) => {
    const {
        patient,
        saveAnamnesis,
        saveGenogram,
        saveSystemicMap
    } = usePatientContext();

    const [activeTool, setActiveTool] = useState<ToolType>('anamnesis');

    if (!patient) return null;

    const tools = [
        { id: 'anamnesis', label: 'Anamnese', icon: <ClipboardListIcon className="w-4 h-4" /> },
        { id: 'inventories', label: 'Avaliações', icon: <Activity className="w-4 h-4" /> },
        { id: 'genogram', label: 'Genograma', icon: <UserGroupIcon className="w-4 h-4" /> },
        { id: 'systemicMap', label: 'Ecomapa', icon: <GlobeIcon className="w-4 h-4" /> },
        { id: 'treatmentPlan', label: 'Plano Terapêutico', icon: <ClipboardListIcon className="w-4 h-4" /> },
        { id: 'rpd', label: 'RPD', icon: <DocumentIcon className="w-4 h-4" /> }, // Keeping DocumentIcon or Sparkles if imported
        { id: 'act_matrix', label: 'Matriz ACT', icon: <GlobeIcon className="w-4 h-4" /> },
        { id: 'emdr', label: 'Trauma/EMDR', icon: <BrainCircuit className="w-4 h-4" /> },
        { id: 'coping', label: 'Cartões', icon: <DocumentIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Sub-Navigation - MD3 Secondary Tabs Pattern */}
            <div className="animate-fadeIn mt-2 w-full">
                <div className="flex flex-nowrap md:flex-wrap items-center gap-2 bg-surface-container-low/80 backdrop-blur-md rounded-3xl p-1.5 mb-8 border border-border/20 dark:border-white/10 shadow-sm transition-all duration-300 overflow-x-auto md:overflow-visible scrollbar-hide max-w-full">
                    {tools.map((tool) => {
                        const isActive = activeTool === tool.id;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id as ToolType)}
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
                                    {tool.icon}
                                </span>
                                {tool.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] animate-fadeIn">
                <Suspense fallback={<div className="p-8 text-center text-foreground-muted ">Carregando ferramenta...</div>}>
                    {activeTool === 'anamnesis' && (
                        <AnamnesisTab
                            patient={patient}
                            onSave={(data) => saveAnamnesis(patient.id, data)}
                            canEdit={canEdit}
                        />
                    )}
                    {activeTool === 'genogram' && (
                        <GenogramTab
                            patient={patient}
                            onSave={(data) => saveGenogram(patient.id, data)}
                            canEdit={canEdit}
                        />
                    )}
                    {activeTool === 'systemicMap' && (
                        <SystemicMapTab
                            patient={patient}
                            onSave={(data) => saveSystemicMap(patient.id, data)}
                            canEdit={canEdit}
                        />
                    )}
                    {activeTool === 'treatmentPlan' && (
                        <TreatmentPlanTab
                            patient={patient}
                        />
                    )}
                    {activeTool === 'rpd' && (
                        <RPDTab patientId={patient.id} />
                    )}
                    {activeTool === 'coping' && (
                        <CopingCardsTab patientId={patient.id} />
                    )}
                    {activeTool === 'emdr' && (
                        <EMDRTab patientId={patient.id} />
                    )}
                    {activeTool === 'inventories' && (
                        <AssessmentsHub patientId={patient.id} />
                    )}
                    {activeTool === 'act_matrix' && (
                        <ACTMatrixTab patientId={patient.id} />
                    )}
                </Suspense>
            </div>
        </div>
    );
};

export default ClinicalToolsTab;
