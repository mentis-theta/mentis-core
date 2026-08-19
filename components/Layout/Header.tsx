import React from 'react';
import Button from '../Button';
import { DownloadIcon, MenuIcon, LinkIcon } from '../Icons';
import { Link } from 'lucide-react';
import { ClearCacheButton } from '../ClearCacheButton';
import ToolGuideButton from '../Tools/ToolGuideButton';
import { Can } from '../Auth/Can';

import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import { useToast } from '@/contexts/ToastContext';
import LeadsInboxPopover from '../LeadsInbox/LeadsInboxPopover';
import type { SchedulingRequest } from '@/types';

interface HeaderProps {
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
    isInstalled: boolean;
    onInstallClick: () => void;
    onOpenLeads?: (req: SchedulingRequest) => void;
    onOpenSettings?: (tab?: 'profile' | 'hours' | 'organization') => void;
    onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isInstalled, onInstallClick, onOpenLeads, onOpenSettings, onToggleMobileMenu }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();

    const handleCopyLink = () => {
        if (!currentUser) return;
        const url = `${window.location.origin}/?schedule_uid=${currentUser.id}`;
        navigator.clipboard.writeText(url);
        addToast("Link de agendamento copiado!", "success");

        // Check if Agenda is Closed
        if (currentUser.schedulingSettings?.active === false) {
            setTimeout(() => {
                return addToast("Atenção: Sua agenda pública está FECHADA. Ative em Controles e Políticas.", "warning");
            }, 300);
        }
    };

    return (
        <header className="
             bg-surface/70  backdrop-blur-xl
             
            border-b  border-border/60   
            sticky top-0 z-40
            transition-colors duration-200
        ">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Left: Logo + Brand */}
                    <div className="flex items-center">
                        {onToggleMobileMenu && (
                            <button
                                onClick={onToggleMobileMenu}
                                className="mr-3 p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low focus:outline-none md:hidden transition-colors"
                            >
                                <MenuIcon className="h-5 w-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/icon-512.svg"
                                alt="Mentis"
                                className="h-8 w-8 flex-shrink-0 dark:invert transition-all duration-200"
                                draggable={false}
                            />
                            <span className="hidden sm:block text-[17px] font-semibold tracking-tight text-on-surface">
                                Mentis
                            </span>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                        {/* Scheduling Link Button */}
                        <Can perform="settings:manage">
                            <>
                                <Button
                                    onClick={handleCopyLink}
                                    variant="ghost"
                                    size="sm"
                                    className="hidden sm:flex items-center text-on-surface-variant hover:bg-surface-container-low !rounded-xl"
                                >
                                    <Link className="mr-1.5 w-4 h-4" />
                                    <span className="text-sm">Meu Link</span>
                                </Button>
                                <Button
                                    onClick={handleCopyLink}
                                    variant="ghost"
                                    size="sm"
                                    className="sm:hidden text-on-surface-variant hover:bg-surface-container-low !rounded-xl"
                                >
                                    <LinkIcon className="h-5 w-5" />
                                </Button>
                                {onOpenLeads && (
                                    <LeadsInboxPopover onApprove={onOpenLeads} />
                                )}
                                <NotificationBell />
                                <ClearCacheButton iconOnly={true} />
                                <ToolGuideButton />
                            </>
                        </Can>

                        {/* Instalar PWA */}
                        {!isInstalled && onInstallClick && (
                            <Button
                                onClick={onInstallClick}
                                variant="ghost"
                                size="sm"
                                className=" text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low !rounded-xl"
                                title="Instalar Aplicativo"
                            >
                                <DownloadIcon className="h-5 w-5" />
                                <span className="ml-1.5 hidden sm:inline text-sm">Instalar</span>
                            </Button>
                        )}

                        {/* User Menu (Avatar + Dropdown) */}
                        <UserMenu theme={theme} toggleTheme={toggleTheme} onOpenSettings={onOpenSettings} />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
