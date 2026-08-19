import { useState, useEffect } from 'react';
// @ts-ignore - Módulo virtual do vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);

    // Registra o Service Worker gerenciado pelo Vite
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('Service Worker Registrado. Escopo:', r?.scope);
        },
        onRegisterError(error: any) {
            console.error('Falha ao registrar Service Worker:', error);
        },
    });

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsAppInstalled(isStandalone);

        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const handleChange = (evt: MediaQueryListEvent) => setIsAppInstalled(evt.matches);
        mediaQuery.addEventListener('change', handleChange);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const handleAppInstalled = () => {
            setIsAppInstalled(true);
            setInstallPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const choiceResult = await installPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        } else {
            setShowInstallModal(true);
        }
    };

    return {
        isAppInstalled,
        showInstallModal,
        setShowInstallModal,
        handleInstallClick
    };
};
