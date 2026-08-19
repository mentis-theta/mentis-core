import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { EMDRRecord } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useEMDR = (patientId?: string) => {
 const { addToast } = useToast();
    const queryClient = useQueryClient();

    const fetchEMDRLogsFn = async (): Promise<EMDRRecord[]> => {
        if (!patientId) return [];
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patientId)
                .eq('type', 'clinical_tool')
                .contains('metadata', { toolType: 'emdr' })
                .order('date', { ascending: false });

            if (error) throw error;

            return (data as any[]).map(record => ({
                ...record,
                toolType: 'emdr'
            })) as EMDRRecord[];

        } catch (error) {
 console.error('Error fetching EMDR logs:', error);
 addToast('Erro ao carregar registros do EMDR.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['emdr', patientId],
        queryFn: fetchEMDRLogsFn,
        enabled: !!patientId,
    });

    const createEMDRLog = async (
        patientId: string,
        authorId: string,
        data: {
            suds: number;
            voc: number;
            targetMemory?: string;
            positiveCognition?: string;
            negativeCognition?: string;
            speed?: string;
            color?: string;
        }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .insert({
                    patient_id: patientId,
                    author_id: authorId,
                    date: new Date().toISOString(),
                    type: 'clinical_tool',
                    content: {
                        targetMemory: data.targetMemory || '',
                        positiveCognition: data.positiveCognition || '',
                        negativeCognition: data.negativeCognition || '',
                    },
                    metadata: {
                        toolType: 'emdr',
                        suds: data.suds,
                        voc: data.voc,
                        speed: data.speed,
                        color: data.color
                    }
                });

            if (error) throw error;
 addToast('Set de Reprocessamento salvo!', 'success');
            queryClient.invalidateQueries({ queryKey: ['emdr', patientId] });
            return true;
        } catch (error) {
 console.error('Error creating EMDR log:', error);
 addToast('Erro ao salvar registro de EMDR.', 'error');
            return false;
        }
    };

    const deleteEMDRLog = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
 addToast('Registro de EMDR excluído.', 'success');
            queryClient.invalidateQueries({ queryKey: ['emdr', patientId] });
            return true;
        } catch (error) {
 console.error('Error deleting EMDR log:', error);
 addToast('Erro ao excluir registro.', 'error');
            return false;
        }
    };

    return {
        records,
        createEMDRLog,
        deleteEMDRLog,
        loading: isLoading
    };
};
