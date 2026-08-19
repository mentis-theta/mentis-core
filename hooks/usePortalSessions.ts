import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

export interface PortalSession {
    id: string;
    patient_id: string;
    device_name: string | null;
    user_agent: string | null;
    created_at: string;
    last_active_at: string;
    is_active: boolean;
    token_version: number;
}

// Helper: extrair nome amigável do dispositivo a partir do user-agent
const getDeviceName = (ua: string): string => {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) {
        const match = ua.match(/Android[^;]*;\s*([^)]+)\)/);
        return match ? match[1].trim().split(' Build')[0] : 'Android';
    }
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'PC (Windows)';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Dispositivo desconhecido';
};

export const usePortalSessions = () => {
    const [sessions, setSessions] = useState<PortalSession[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSessions = useCallback(async (patientId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_portal_sessions', {
                p_patient_id: patientId
            });
            if (error) throw error;
            setSessions(data || []);
            return data || [];
        } catch (err) {
            console.error('Error fetching portal sessions:', err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const registerAccess = useCallback(async (patientId: string, tokenVersion: number = 1): Promise<string | null> => {
        try {
            const ua = navigator.userAgent;
            const deviceName = getDeviceName(ua);

            const { data, error } = await supabase.rpc('register_portal_access', {
                p_patient_id: patientId,
                p_device_name: deviceName,
                p_user_agent: ua,
                p_token_version: tokenVersion
            });

            if (error) {
                // Verificar se é erro de limite
                if (error.message?.includes('DEVICE_LIMIT_REACHED')) {
                    throw new Error('DEVICE_LIMIT_REACHED');
                }
                throw error;
            }

            return data as string;
        } catch (err: any) {
            if (err.message === 'DEVICE_LIMIT_REACHED') {
                throw err; // Re-throw para o chamador tratar
            }
            console.error('Error registering portal access:', err);
            return null;
        }
    }, []);

    const revokeSession = useCallback(async (sessionId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.rpc('revoke_portal_session', {
                p_session_id: sessionId
            });
            if (error) throw error;
            // Atualizar lista local
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_active: false } : s));
            return true;
        } catch (err) {
            console.error('Error revoking portal session:', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteSession = useCallback(async (sessionId: string) => {
        setLoading(true);
        try {
            // Tenta via RPC primeiro
            const { error } = await supabase.rpc('delete_portal_session', {
                p_session_id: sessionId
            });
            
            // Se der erro (ex: RPC não existe), faz fallback para delete direto
            if (error) {
                const res = await supabase.from('portal_sessions').delete().eq('id', sessionId);
                if (res.error) throw res.error;
            }
            
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            return true;
        } catch (err) {
            console.error('Error deleting portal session:', err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const activeSessions = sessions.filter(s => s.is_active);

    return {
        sessions,
        activeSessions,
        loading,
        fetchSessions,
        registerAccess,
        revokeSession,
        deleteSession
    };
};
