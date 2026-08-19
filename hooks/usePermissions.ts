import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppPermission, AppRole } from '../types';
import { ROLE_PERMISSIONS } from '../config/permissions';

export const usePermissions = () => {
    const { currentUser } = useAuth();
    
    // Fallback gracefully se não estiver logado ou se a role for inválida
    const role: AppRole | null = (currentUser?.role as AppRole) || null;

    const can = useCallback((permission: AppPermission): boolean => {
        if (!role) return false;
        
        const userPermissions = ROLE_PERMISSIONS[role] || [];
        return userPermissions.includes(permission);
    }, [role]);

    return {
        can,
        role,
        isAuthenticated: !!currentUser
    };
};
