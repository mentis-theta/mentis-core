import React, { useState } from 'react';
import { RefreshIcon } from '@/components/Icons';
import { getPortalToken, setPortalToken } from '@/services/portalAuthService';

export const ClearCacheButton: React.FC<{ className?: string, isPortal?: boolean, iconOnly?: boolean }> = ({ className = '', isPortal = false, iconOnly = false }) => {
    const [isClearing, setIsClearing] = useState(false);

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            // 1. Limpar Service Workers (PWA Cache)
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Limpar caches locais de armazenamento (Mantendo apenas preferências vitais como tema)
            const theme = localStorage.getItem('mentis_theme');
            const mode = localStorage.getItem('mentis_theme_mode');
            const savedToken = getPortalToken();
            
            localStorage.clear();
            sessionStorage.clear();

            // Restaurar preferências vitais para a tela não piscar feio
            if (theme) localStorage.setItem('mentis_theme', theme);
            if (mode) localStorage.setItem('mentis_theme_mode', mode);
            if (isPortal && savedToken) {
                const syntheticRaw = btoa(`${savedToken.patientId}:${savedToken.secret}:${savedToken.version}`);
                setPortalToken(syntheticRaw, savedToken.version);
            }

            // 3. Forçar o recarregamento total da página (bypass cache)
            window.location.reload();
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            setIsClearing(false);
        }
    };

    return (
        <button
            onClick={handleClearCache}
            disabled={isClearing}
            className={`flex items-center justify-center p-2 rounded-full text-foreground-muted hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
            title="Sincronizar sistema e corrigir erros"
        >
            <RefreshIcon className={`w-5 h-5 ${isClearing ? 'animate-spin text-indigo-600' : ''}`} />
            {!iconOnly && (
                <span className="ml-2 text-xs font-medium">
                    {isClearing ? 'Atualizando...' : 'Corrigir Erros de Tela'}
                </span>
            )}
        </button>
    );
};
