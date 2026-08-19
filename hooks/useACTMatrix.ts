import { supabase } from '../services/supabaseClient';
import { ACTMatrixRecord, ACTMatrixContent } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useACTMatrix = (patientId?: string) => {
 const { addToast } = useToast();
    const queryClient = useQueryClient();

    const fetchACTMatricesFn = async (): Promise<ACTMatrixRecord[]> => {
        if (!patientId) return [];
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patientId)
                .eq('type', 'clinical_tool')
                .contains('metadata', { toolType: 'act_matrix' })
                .order('date', { ascending: false }) // Mais recente primeiro
                .limit(1); // Normal pegar apenas a matriz ativa no MVP

            if (error) throw error;

            return (data as any[]).map(record => ({
                ...record,
                toolType: 'act_matrix'
            })) as ACTMatrixRecord[];

        } catch (error) {
 console.error('Error fetching ACT Matrix:', error);
 addToast('Erro ao carregar Matriz ACT.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['act_matrix', patientId],
        queryFn: fetchACTMatricesFn,
        enabled: !!patientId,
    });

    const saveACTMatrix = async (
        patientId: string,
        authorId: string,
        matrixContent: ACTMatrixContent,
        matrixId?: string // Se existir atualiza, senão cria
    ): Promise<boolean> => {
        try {
            if (matrixId) {
                // UPDATE
                const { error } = await supabase
                    .from('clinical_records')
                    .update({
                        content: matrixContent as any, // Supabase JSON type cast
                        date: new Date().toISOString()
                    })
                    .eq('id', matrixId)
                    .eq('type', 'clinical_tool')
                    .contains('metadata', { toolType: 'act_matrix' });

                if (error) throw error;
 addToast('Matriz ACT atualizada!', 'success');
            } else {
                // INSERT Novo
                const { error } = await supabase
                    .from('clinical_records')
                    .insert({
                        patient_id: patientId,
                        author_id: authorId,
                        date: new Date().toISOString(),
                        type: 'clinical_tool',
                        content: matrixContent as any,
                        metadata: {
                            toolType: 'act_matrix'
                        }
                    });
                if (error) throw error;
 addToast('Matriz ACT inicializada!', 'success');
            }

            queryClient.invalidateQueries({ queryKey: ['act_matrix', patientId] });
            return true;
        } catch (error) {
 console.error('Error saving ACT Matrix:', error);
 addToast('Erro ao salvar a Matriz.', 'error');
            return false;
        }
    };

    return {
        activeMatrix: records.length > 0 ? records[0] : null,
        saveACTMatrix,
        loading: isLoading
    };
};
