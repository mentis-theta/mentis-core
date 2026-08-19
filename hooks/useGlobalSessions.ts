import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useCrypto } from '../contexts/CryptoContext';
import * as cryptoService from '../services/cryptoService';
import { Session } from '../types';

export interface LightweightSession {
    id: string;
    patientId: string;
    date: string;
    duration: number;
    status: string;
    price: number;
    paymentStatus: string;
    sessionType?: string;
    // Keep it minimal to save RAM
}

export const useGlobalSessions = () => {
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();

    const fetchGlobalSessions = async (): Promise<LightweightSession[]> => {
        if (!currentUser || !masterKey) return [];

        // 1. Download all sessions for the current user
        const { data, error } = await supabase
            .from('patient_sessions')
            .select('id, patient_id, encrypted_data')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error("Failed to fetch global sessions", error);
            throw error;
        }

        if (!data || data.length === 0) return [];

        const CHUNK_SIZE = 100;
        const lightweightSessions: LightweightSession[] = [];

        // 2. Decrypt in chunks to protect the Event Loop
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);

            for (const row of chunk) {
                try {
                    const fullSession = cryptoService.decryptData<Session>(row.encrypted_data, masterKey);
                    
                    // Extract only the lightweight fields and let GC clean the rest
                    lightweightSessions.push({
                        id: fullSession.id || row.id,
                        patientId: row.patient_id,
                        date: fullSession.date,
                        duration: fullSession.duration || 50,
                        status: fullSession.status || 'completed',
                        price: fullSession.price || 0,
                        paymentStatus: fullSession.paymentStatus || 'pending',
                        sessionType: fullSession.sessionType
                    });
                } catch (e) {
                    // Ignore decryption failures for corrupted records
                }
            }

            // Yield to the event loop
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return lightweightSessions;
    };

    const { data: globalSessions = [], isLoading, refetch } = useQuery({
        queryKey: ['global_sessions_lightweight', currentUser?.id],
        queryFn: fetchGlobalSessions,
        enabled: !!currentUser?.id && !!masterKey,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    return {
        globalSessions,
        isLoading,
        refetch
    };
};
