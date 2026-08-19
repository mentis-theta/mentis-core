import React, { useState } from 'react';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { AlertTriangle, ChartBar, FileText, BookOpen, X, Brain } from 'lucide-react';
import PerformancePanel from '../Supervision/PerformancePanel.tsx';
import PlanningPanel from '../Supervision/PlanningPanel.tsx';
import NotebooksPanel from '../Supervision/NotebooksPanel.tsx';
import MemoryPanel from '../Supervision/MemoryPanel.tsx';

type SubTab = 'performance' | 'planning' | 'notebooks' | 'memory';

const BANNER_STORAGE_KEY = 'mentis:supervision-banner-dismissed';

const SupervisionTab: React.FC = () => {
    const { patient, currentUser } = usePatientContext();
    const [activeTab, setActiveTab] = useState<SubTab>('performance');
    const [showBanner, setShowBanner] = useState(() => {
        try { return localStorage.getItem(BANNER_STORAGE_KEY) !== 'true'; } catch { return true; }
    });

    if (!patient) return null;

    const handleDismissBanner = () => {
        setShowBanner(false);
        try { localStorage.setItem(BANNER_STORAGE_KEY, 'true'); } catch {}
    };

    const tabs = [
        { id: 'performance', label: 'Painel de Desempenho', icon: <ChartBar className="w-4 h-4" /> },
        { id: 'planning', label: 'Planejamento (Caso)', icon: <FileText className="w-4 h-4" /> },
        { id: 'notebooks', label: 'Cadernos', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'memory', label: 'Memória da IA', icon: <Brain className="w-4 h-4" /> },
    ];

    return (
        <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Banner Confidencial (Dismissable) */}
            {showBanner && (
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <h4 className="font-bold text-amber-800 dark:text-amber-400">Área Estritamente Confidencial</h4>
                    <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">
                        O conteúdo desta aba é para uso exclusivo do terapeuta. O paciente não tem acesso a estes dados via Portal.
                    </p>
                </div>
                <button
                    onClick={handleDismissBanner}
                    className="p-1 rounded-lg text-amber-600/60 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors flex-shrink-0"
                    title="Fechar aviso"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            )}

            {/* Navegação Interna - MD3 Secondary Tabs Pattern */}
            <div className="animate-fadeIn mt-2">
                <div className="flex flex-wrap items-center gap-2 bg-surface-container-low/80 backdrop-blur-md rounded-3xl p-1.5 border border-border/20 dark:border-white/10 shadow-sm transition-all duration-300 w-fit">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SubTab)}
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
                                    {tab.icon}
                                </span>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Conteúdo */}
            <div className="min-h-[400px]">
                {activeTab === 'performance' && (
                    <PerformancePanel patient={patient} currentUser={currentUser} />
                )}
                {activeTab === 'planning' && (
                    <PlanningPanel patient={patient} currentUser={currentUser} />
                )}
                {activeTab === 'notebooks' && (
                    <NotebooksPanel patient={patient} currentUser={currentUser} />
                )}
                {activeTab === 'memory' && (
                    <MemoryPanel patient={patient} currentUser={currentUser} />
                )}
            </div>
        </div>
    );
};

export default SupervisionTab;
