import React, { useState, useEffect } from 'react';
// Import Lazy Loader
import { lazyWithRetry } from '@/utils/lazyLoad';
import { Suspense } from 'react';

const OrganizationSettings = lazyWithRetry(() => import('./OrganizationSettings').then(module => ({ default: module.OrganizationSettings })));
const ProfileSettings = lazyWithRetry(() => import('./ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const MyLinkSettings = lazyWithRetry(() => import('./MyLink/MyLinkSettings').then(module => ({ default: module.MyLinkSettings })));
const BackupSettings = lazyWithRetry(() => import('./sections/BackupSettings').then(module => ({ default: module.BackupSettings })));
const SecuritySettings = lazyWithRetry(() => import('./sections/SecuritySettings').then(module => ({ default: module.SecuritySettings })));

import { UserCircleIcon, UserGroupIcon, TagIcon, ClockIcon, LinkIcon, DownloadIcon } from '../Icons';

import { SettingsTab } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSearchParams } from 'react-router-dom';

interface SettingsPageProps {
    defaultTab?: SettingsTab;
}

// Simple Inline Fallback for Settings Content
const SettingsSectionFallback = () => (
    <div className="flex flex-col items-center justify-center h-64 w-full animate-fadeIn">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted opacity-50">Preparando menu...</p>
    </div>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ defaultTab }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
    
    const [activeTab, setActiveTab] = useState<SettingsTab>(tabFromUrl || defaultTab || 'organization');

    useEffect(() => {
        if (tabFromUrl) setActiveTab(tabFromUrl);
        else if (defaultTab) setActiveTab(defaultTab);
    }, [defaultTab, tabFromUrl]);

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: UserCircleIcon, disabled: false },
        { id: 'link', label: 'Meu Link', icon: LinkIcon, disabled: false },
        { id: 'organization', label: 'Organização', icon: TagIcon, disabled: false },
        { id: 'security', label: 'Segurança', icon: UserCircleIcon, disabled: false },
        { id: 'backup', label: 'Backup', icon: DownloadIcon, disabled: false },
        { id: 'patients', label: 'Pacientes', icon: UserGroupIcon, disabled: true },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden bg-canvas animate-fadeIn relative">
            {/* Ethereal Background Effect (Mists) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full overflow-hidden">
                {/* Header - Compact & Subtle Background */}
                <div className="bg-neutral-400/5 border-b border-border/40 dark:border-white/10 px-4 md:px-8 py-4 md:py-5 transition-all duration-300 backdrop-blur-sm shrink-0">
                    <div className="flex flex-col items-start justify-center">
                        <h1 className="text-lg md:text-[20px] font-black text-foreground uppercase tracking-tight leading-tight">Configurações</h1>
                        <p className="text-[10px] font-black text-foreground uppercase tracking-widest mt-1.5 md:mt-2.5 opacity-80 hidden md:block">Gerencie as preferências do sistema e sua conta</p>
                    </div>
                </div>

                {/* ═══ MOBILE: Tabs horizontais com scroll (< md) ═══ */}
                <div className="flex md:hidden overflow-x-auto no-scrollbar border-b border-border/40 bg-surface-container-low/50 backdrop-blur-md shrink-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.disabled) return;
                                    if (tab.id === 'link' && currentUser?.schedulingSettings?.active === false) {
 addToast("Atenção: Seu site de agendamento está FECHADO.", "warning");
                                    }
                                    setActiveTab(tab.id as SettingsTab);
                                }}
                                disabled={tab.disabled}
                                className={`
                                    flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap
                                    min-h-[44px] transition-all duration-200
                                    border-b-2
                                    ${isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-foreground-muted hover:text-foreground'
                                    }
                                    ${tab.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 flex flex-col md:flex-row items-start gap-4 md:gap-6 p-4 md:p-6 overflow-hidden min-h-0">
                    {/* ═══ DESKTOP: Sidebar vertical (md+) ═══ */}
                    <aside className="hidden md:flex w-52 flex-shrink-0 h-full overflow-y-auto bg-surface-container-low/50 backdrop-blur-md rounded-[20px] p-1.5 border border-border/20 dark:border-white/10 shadow-sm transition-all duration-300 flex-col" tabIndex={0}>
                        <nav className="space-y-1 px-0.5">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if (tab.disabled) return;
                                            if (tab.id === 'link' && currentUser?.schedulingSettings?.active === false) {
 addToast("Atenção: Seu site de agendamento está FECHADO.", "warning");
                                            }
                                            setActiveTab(tab.id as SettingsTab);
                                        }}
                                        disabled={tab.disabled}
                                        className={`
                                        w-full flex items-center px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-200 select-none
                                        ${isActive
                                                ? 'bg-primary/20 text-primary shadow-sm ring-1 ring-primary/40'
                                                : 'text-foreground-muted hover:text-foreground hover:bg-surface-container-high'
                                            }
                                        ${tab.disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                    `}
                                    >
                                        <Icon className={`mr-2.5 h-4 w-4 transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : 'opacity-60'}`} />
                                        {tab.label}
                                        {tab.disabled && (
                                            <span className="ml-auto text-[7px] font-black bg-background/50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-full border border-border/20 uppercase tracking-tighter opacity-70">
                                                Beta
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <section className="flex-1 h-full min-w-0 overflow-y-auto custom-scrollbar pb-safe md:pb-32 pr-0 md:pr-2 w-full" tabIndex={0}>
                        <Suspense fallback={<SettingsSectionFallback />}>
                            {activeTab === 'organization' && (
                                <div className="animate-fade-in-up">
                                    <OrganizationSettings />
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="animate-fade-in-up">
                                    <ProfileSettings />
                                </div>
                            )}

                            {activeTab === 'link' && (
                                <div className="animate-fade-in-up">
                                    <MyLinkSettings />
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="animate-fade-in-up">
                                    <SecuritySettings />
                                </div>
                            )}

                            {activeTab === 'backup' && (
                                <div className="animate-fade-in-up">
                                    <BackupSettings />
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="bg-surface shadow rounded-lg p-6 text-center text-foreground-muted">
                                    Configurações Gerais em breve.
                                </div>
                            )}

                            {activeTab === 'patients' && (
                                <div className="bg-surface shadow rounded-lg p-6 text-center text-foreground-muted">
                                    Configurações de Pacientes em breve.
                                </div>
                            )}
                        </Suspense>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
