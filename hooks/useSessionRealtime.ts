import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useCrypto } from '../contexts/CryptoContext';
import * as cryptoService from '../services/cryptoService';
import type { Session } from '../types';
import { HydratedData } from '../services/patientHydrationService';

/**
 * Hook dedicado para escutar atualizações em tempo real nas sessões de um paciente específico.
 * Foca exclusivamente no 'extraction_status' e outras mudanças de background orquestradas pelas Edge Functions.
 */
export const useSessionRealtime = (patientId: string | undefined) => {
    const queryClient = useQueryClient();
    const { masterKey } = useCrypto();

    useEffect(() => {
        if (!patientId || !masterKey) return;


        const channelName = `public:patient_sessions:patient_${patientId}`;
        
        // Evita Zombie Listeners: checa se já existe um canal com esse nome ativo
        const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
        if (existingChannel) {
            supabase.removeChannel(existingChannel);
        }

        // Realtime Subscription
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',

                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'patient_sessions',
                    filter: `patient_id=eq.${patientId}`
                },
                (payload) => {
                    const row = payload.new as any;
                    if (!row.encrypted_data) return;

                    try {
                        const updatedSession = cryptoService.decryptData<Session>(row.encrypted_data, masterKey);
                        if (!updatedSession) return;

                        const depths = ['summary', 'clinical_evolution', 'full_audit'];
                        depths.forEach(depth => {
                            queryClient.setQueryData<HydratedData>(['decoupled_data', patientId, depth], (old) => {
                                if (!old) return old;
                                
                                const sessionExists = old.sessions.some(s => s.id === updatedSession.id);
                                if (sessionExists) {
                                    return {
                                        ...old,
                                        sessions: old.sessions.map(s => 
                                            s.id === updatedSession.id ? updatedSession : s
                                        )
                                    };
                                }
                                return old;
                            });
                        });
                    } catch (e) {
                        console.error('Failed to decrypt session from realtime payload', e);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [patientId, masterKey, queryClient]); 
};
