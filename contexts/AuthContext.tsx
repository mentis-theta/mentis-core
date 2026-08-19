import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, RegisterData, AuditLog } from '../types.ts';
import * as authService from '../services/authService.ts';
import * as auditLogService from '../services/auditLogger';
import * as migrationService from '../services/migrationService.ts';
import { supabase } from '../services/supabaseClient.ts';
import { useCrypto } from './CryptoContext.tsx';
import { useToast } from './ToastContext.tsx';
import { clearQueryCache } from '../services/queryClient.ts';
import * as Sentry from "@sentry/react";

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  auditLogs: AuditLog[];
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  completeMFALogin: (user: User, masterKey: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUsers: () => void;
  updateUser: (updatedUsers: User[]) => void;
  linkStaff: (staffId: string) => Promise<{ success: boolean; error?: string }>;
  unlinkStaff: (staffId: string) => Promise<void>;
  recoveryKey: string | null;
  clearRecoveryKey: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  // Crypto Hook
  const { unlockVault, lockVault } = useCrypto();
  const { addToast } = useToast();

  const refreshAuthData = useCallback(async () => {
    setIsLoadingAuth(true);
    const user = await authService.getCurrentUser();
    setCurrentUser(user);

    if (user) {
      setSentryUser(user);
      const allUsers = await authService.getUsers();
      setUsers(allUsers);
    } else {
      setUsers([]);
      Sentry.setUser(null);
    }

    if (user?.role === 'admin') {
      const logs = await auditLogService.fetchLogs();
      setAuditLogs(logs);
    } else {
      setAuditLogs([]);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    refreshAuthData();

    // Listen for Auth Changes (e.g. Session Expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const e = event as string;
      
      if (e === 'PASSWORD_RECOVERY') {
        window.location.href = '/update-password';
      }

      if (e === 'SIGNED_OUT' || e === 'TOKEN_REFRESH_REVOKED') {
        setCurrentUser(null);
        setUsers([]);
        setAuditLogs([]);
        lockVault();
        clearQueryCache(); // Security: Wipe offline clinical cache on sign out
        if (e === 'TOKEN_REFRESH_REVOKED') {
          // Force a cleanup to ensure no stale state remains
          authService.logout();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuthData, lockVault]);

  const setSentryUser = useCallback((user: User) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authService.login(email, password);

      if (result.mfaRequired) {
        return {
          success: true,
          error: undefined,
          mfaRequired: true,
          user: result.user,
          masterKey: result.masterKey
        };
      }

      if (result.success && result.user && result.masterKey) {
        setSentryUser(result.user);
        setCurrentUser(result.user);
        unlockVault(result.masterKey);
        await migrationService.migrateLocalStorageToSupabase(result.masterKey, result.user.id);
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      Sentry.captureException(error);
      return { success: false, error: "Erro na autenticação" };
    }
  }, [setSentryUser, unlockVault]);

  const completeMFALogin = useCallback(async (user: User, masterKey: string) => {
    setCurrentUser(user);
    unlockVault(masterKey);
    await migrationService.migrateLocalStorageToSupabase(masterKey, user.id);

    if (user.role === 'admin') {
      const logs = await auditLogService.fetchLogs();
      setAuditLogs(logs);
    }
  }, [unlockVault]);

  const register = useCallback(async (data: RegisterData) => {
    const result = await authService.register(data);
    if (result.success && result.user && result.masterKey) {
      setCurrentUser(result.user);
      unlockVault(result.masterKey);
      setRecoveryKey(result.masterKey);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, [unlockVault]);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setAuditLogs([]);
    lockVault();
    clearQueryCache();
  }, [lockVault]);

  const clearRecoveryKey = useCallback(() => setRecoveryKey(null), []);

  const updateUser = useCallback((updatedUsers: User[]) => {
    setUsers(updatedUsers);
  }, []);

  const linkStaff = useCallback(async (staffId: string) => {
    if (!currentUser) return { success: false, error: "No user" };

    const prevUsers = [...users];
    const updated = users.map(u => {
      if (u.id === currentUser.id) return { ...u, linkedUserIds: [...(u.linkedUserIds || []), staffId] };
      if (u.id === staffId) return { ...u, linkedUserIds: [...(u.linkedUserIds || []), currentUser.id] };
      return u;
    });
    setUsers(updated);

    const result = await authService.linkUsers(currentUser.id, staffId);
    if (!result.success) {
      setUsers(prevUsers);
      return result;
    }
    return { success: true };
  }, [currentUser, users]);

  const unlinkStaff = useCallback(async (staffId: string) => {
    if (!currentUser) return;

    const prevUsers = [...users];
    const updated = users.map(u => {
      if (u.id === currentUser.id) return { ...u, linkedUserIds: (u.linkedUserIds || []).filter(id => id !== staffId) };
      if (u.id === staffId) return { ...u, linkedUserIds: (u.linkedUserIds || []).filter(id => id !== currentUser.id) };
      return u;
    });
    setUsers(updated);

    const result = await authService.unlinkUsers(currentUser.id, staffId);
    if (!result.success) {
      setUsers(prevUsers);
    }
  }, [currentUser, users]);

  const contextValue = useMemo(() => ({
    currentUser,
    users,
    auditLogs,
    isLoadingAuth,
    login,
    completeMFALogin,
    register,
    logout,
    refreshUsers: refreshAuthData,
    updateUser,
    linkStaff,
    unlinkStaff,
    recoveryKey,
    clearRecoveryKey
  }), [
    currentUser,
    users,
    auditLogs,
    isLoadingAuth,
    login,
    completeMFALogin,
    register,
    logout,
    refreshAuthData,
    updateUser,
    linkStaff,
    unlinkStaff,
    recoveryKey,
    clearRecoveryKey
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
