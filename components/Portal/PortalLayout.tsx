import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../Button';
import { usePWA } from '@/hooks/usePWA';
import InstallModal from '../InstallModal';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { ArrowLeft } from 'lucide-react';
import { ClearCacheButton } from '../ClearCacheButton';

interface PortalLayoutProps {
    children: React.ReactNode;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
    const { logout, currentUser } = useAuth();
    const { isAppInstalled, showInstallModal, setShowInstallModal, handleInstallClick } = usePWA();
    const { currentPath, navigateTo } = usePortalNavigation();

    const isHome = currentPath === '/portal' || currentPath === '/portal/';
    const isLogin = currentPath === '/portal/login';

    return (
        <div className="min-h-screen bg-background text-on-surface font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
            {/* Header — Translúcido M3 */}
            <header className=" bg-surface/70 backdrop-blur-xl border-b border-border/60 sticky top-0 z-30 transition-colors duration-300">
                <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {(!isHome && !isLogin) && (
                            <button onClick={() => navigateTo('/portal')} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/icon-512.svg"
                                alt="Mentis Portal"
                                className="h-8 w-8 flex-shrink-0 dark:invert transition-transform duration-300 hover:scale-105"
                                draggable={false}
                            />
                            <span className="font-semibold text-xl tracking-tight text-on-surface hidden sm:block">
                                Mentis <span className="text-indigo-500 dark:text-indigo-400 font-medium text-sm ml-0.5">Portal</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        {!isLogin && (
                            <ClearCacheButton isPortal={true} iconOnly={true} className="!p-2 mr-1" />
                        )}
                        {currentUser && (
                            <>
                                {!isAppInstalled && (
                                    <Button variant="ghost" size="sm" onClick={handleInstallClick} className="!rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium hidden sm:flex">
                                        Instalar App
                                    </Button>
                                )}
                                <span className="text-sm text-foreground-muted hidden sm:block font-medium">
                                    {currentUser.name || 'Paciente'}
                                </span>
                                <Button variant="ghost" size="sm" onClick={logout} className="!rounded-full text-foreground-muted hover:text-red-500 transition-colors duration-300">
                                    Sair
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content — Fade In Terapêutico (500ms) */}
            <main className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-8 animate-[fadeIn_500ms_ease-out]">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-auto">
                <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-slate-300 font-medium">
                    &copy; {new Date().getFullYear()} Mentis. Todos os direitos reservados.
                </div>
            </footer>
            
            <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
        </div>
    );
};

export default PortalLayout;
