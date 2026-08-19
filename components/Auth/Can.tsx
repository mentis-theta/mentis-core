import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { AppPermission } from '../../types';

interface CanProps {
    perform: AppPermission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Componente declarativo para ocultar partes da UI baseando-se em Permissões.
 * Exemplo: <Can perform="patient:delete"><Button>Excluir</Button></Can>
 */
export const Can: React.FC<CanProps> = ({ perform, children, fallback = null }) => {
    const { can } = usePermissions();

    if (can(perform)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
