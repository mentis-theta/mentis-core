import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook de navegação SPA para o Portal do Paciente.
 * Envolve os hooks do React Router DOM para facilitar chamadas legadas.
 */
export const usePortalNavigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const navigateTo = useCallback((path: string) => {
        if (path === currentPath) return;
        navigate(path);
    }, [currentPath, navigate]);

    const goBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return { currentPath, navigateTo, goBack };
};
