import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { RPDRecord, CognitiveDistortion } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useRPD = (patientId?: string) => {
 const { addToast } = useToast();
    const queryClient = useQueryClient();

    const fetchRPDsFn = async (): Promise<RPDRecord[]> => {
        if (!patientId) return [];
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patientId)
                .eq('type', 'clinical_tool')
                .contains('metadata', { toolType: 'rpd' })
                .order('date', { ascending: false });

            if (error) throw error;

            // Map the raw DB response to our typed RPDRecord if necessary
            // For now, assuming the structure matches closely enough or we cast it
            return (data as any[]).map(record => ({
                ...record,
                toolType: 'rpd'
            })) as RPDRecord[];

        } catch (error) {
 console.error('Error fetching RPDs:', error);
 addToast('Erro ao carregar registros de pensamentos.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['rpds', patientId],
        queryFn: fetchRPDsFn,
        enabled: !!patientId,
    });

    const createRPD = async (
        patientId: string,
        authorId: string,
        data: {
            situation: string;
            thought: string;
            rationalResponse: string;
            emotion: string;
            intensity: number;
            distortions: CognitiveDistortion[];
            date: string;
        }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .insert({
                    patient_id: patientId,
                    author_id: authorId,
                    date: data.date,
                    type: 'clinical_tool',
                    content: {
                        situation: data.situation,
                        thought: data.thought,
                        rationalResponse: data.rationalResponse
                    },
                    metadata: {
                        toolType: 'rpd',
                        emotion: data.emotion,
                        intensity: data.intensity,
                        distortions: data.distortions
                    }
                });

            if (error) throw error;
 addToast('Registro salvo com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['rpds', patientId] });
            return true;
        } catch (error) {
 console.error('Error creating RPD:', error);
 addToast('Erro ao salvar registro.', 'error');
            return false;
        }
    };

    const deleteRPD = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
 addToast('Registro excluído.', 'success');
            queryClient.invalidateQueries({ queryKey: ['rpds', patientId] });
            return true;
        } catch (error) {
 console.error('Error deleting RPD:', error);
 addToast('Erro ao excluir registro.', 'error');
            return false;
        }
    };

    const saveFeedback = async (recordId: string, feedback: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .update({
                    therapist_feedback: feedback,
                    feedback_at: new Date().toISOString()
                })
                .eq('id', recordId);

            if (error) throw error;
 addToast('Orientação salva com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['rpds', patientId] });
            return true;
        } catch (error) {
 console.error('Error saving feedback:', error);
 addToast('Erro ao salvar orientação.', 'error');
            return false;
        }
    };

    return {
        records,
        createRPD,
        deleteRPD,
        saveFeedback,
        loading: isLoading
    };
};
