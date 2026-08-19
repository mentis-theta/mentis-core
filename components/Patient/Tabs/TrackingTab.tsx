import React, { useState, Suspense } from 'react';
import type { Patient } from '@/types';
import { Activity, ClipboardList, TrendingUp } from 'lucide-react';

// Lazy load the sub-components
const DailyMonitoringTab = React.lazy(() => import('./DailyMonitoringTab'));
const PracticesDashboard = React.lazy(() => import('../PracticesDashboard'));
const ReportsDashboard = React.lazy(() => import('../ReportsDashboard'));

interface TrackingTabProps {
    patient: Patient;
}

type TrackingSection = 'monitoring' | 'practices' | 'reports';

const TrackingTab: React.FC<TrackingTabProps> = ({ patient }) => {
    const [activeSection, setActiveSection] = useState<TrackingSection>('monitoring');

    if (!patient) return null;

    const sections = [
        { id: 'monitoring', label: 'Monitoramento Diário', icon: <Activity className="w-4 h-4" /> },
        { id: 'practices', label: 'Práticas Prescritas', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'reports', label: 'Relatórios', icon: <TrendingUp className="w-4 h-4" /> },
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
                                onClick={() => setActiveSection(section.id as TrackingSection)}
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
                <Suspense fallback={<div className="p-8 text-center text-foreground-muted ">Carregando painel de acompanhamento...</div>}>
                    {activeSection === 'monitoring' && (
                        <DailyMonitoringTab patientId={patient.id} />
                    )}
                    {activeSection === 'practices' && (
                        <PracticesDashboard patient={patient} />
                    )}
                    {activeSection === 'reports' && (
                        <ReportsDashboard patient={patient} />
                    )}
                </Suspense>
            </div>
        </div>
    );
};

export default TrackingTab;
