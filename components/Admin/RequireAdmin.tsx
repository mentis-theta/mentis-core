import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface RequireAdminProps {
  children: React.ReactNode;
}

export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { currentUser, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <div className="h-screen w-full flex items-center justify-center text-gray-500">Verificando permissões...</div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    // Se não for admin, chuta de volta pra home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
