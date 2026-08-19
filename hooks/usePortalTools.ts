import { supabase } from '../services/supabaseClient';
import { CopingCardRecord, MindfulnessDiaryRecord, ClinicalRecord } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePortalUser } from './usePortalUser';

// --- Coping Cards Hook ---
export const useCopingCards = (patientId?: string) => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { isSimulation, isMagic, magicTokenVersion } = usePortalUser();

    const fetchCopingCardsFn = async (): Promise<CopingCardRecord[]> => {
        if (!patientId) return [];
        try {
            let data;
            let error;
            if (isMagic) {
                const result = await supabase.rpc('get_portal_clinical_records', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_tool_type: 'coping_card'
                });
                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .select('*')
                    .eq('patient_id', patientId)
                    .eq('type', 'clinical_tool')
                    .contains('metadata', { toolType: 'coping_card' })
                    .order('date', { ascending: false });
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            return (data as unknown as ClinicalRecord[]).map(record => ({
                ...record,
                toolType: 'coping_card'
            })) as CopingCardRecord[];

        } catch (error) {
 addToast('Erro ao carregar Cartões de Enfrentamento.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['coping_cards', patientId],
        queryFn: fetchCopingCardsFn,
        enabled: !!patientId,
    });

    const createCopingCard = async (
        patientId: string,
        authorId: string,
        data: { text: string; category?: 'defusion' | 'values' | 'grounding' | 'general'; authorType: 'psychologist' | 'patient' }
    ): Promise<boolean> => {
        // Blindagem: modo simulação não persiste dados clínicos
        if (isSimulation) {
 addToast('Modo Simulação: Os dados não serão salvos no prontuário real.', 'info');
            return true;
        }

        try {
            let error;
            if (isMagic) {
                const result = await supabase.rpc('insert_portal_clinical_record', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_content: {
                        text: data.text,
                        category: data.category || 'general'
                    },
                    p_metadata: {
                        toolType: 'coping_card',
                        authorType: data.authorType
                    }
                });
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .insert({
                        patient_id: patientId,
                        author_id: authorId,
                        date: new Date().toISOString(),
                        type: 'clinical_tool',
                        content: {
                            text: data.text,
                            category: data.category || 'general'
                        },
                        metadata: {
                            toolType: 'coping_card',
                            authorType: data.authorType
                        }
                    });
                error = result.error;
            }

            if (error) throw error;
 addToast('Cartão de Enfrentamento criado!', 'success');
            await queryClient.invalidateQueries({ queryKey: ['coping_cards', patientId] });
            return true;
        } catch (error) {
 addToast('Erro ao criar cartão.', 'error');
            return false;
        }
    };

    const deleteCopingCard = async (id: string): Promise<boolean> => {
        // Blindagem: modo simulação não permite exclusão de dados clínicos
        if (isSimulation) {
 addToast('Modo Simulação: Os dados não serão alterados no prontuário real.', 'info');
            return true;
        }

        try {
            let error;
            if (isMagic) {
                const result = await supabase.rpc('delete_portal_clinical_record', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_record_id: id
                });
                error = result.error;
            } else {
                const result = await supabase.from('clinical_records').delete().eq('id', id);
                error = result.error;
            }
            if (error) throw error;
 addToast('Cartão removido.', 'success');
            await queryClient.invalidateQueries({ queryKey: ['coping_cards', patientId] });
            return true;
        } catch (error) {
 addToast('Erro ao excluir cartão.', 'error');
            return false;
        }
    };

    return { records, createCopingCard, deleteCopingCard, loading: isLoading };
};

// --- Mindfulness Diary Hook ---
export const useMindfulness = (patientId?: string) => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { isSimulation, isMagic, magicTokenVersion } = usePortalUser();

    const fetchMindfulnessLogsFn = async (): Promise<MindfulnessDiaryRecord[]> => {
        if (!patientId) return [];
        try {
            let data;
            let error;
            if (isMagic) {
                const result = await supabase.rpc('get_portal_clinical_records', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_tool_type: 'mindfulness_diary'
                });
                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .select('*')
                    .eq('patient_id', patientId)
                    .eq('type', 'clinical_tool')
                    .contains('metadata', { toolType: 'mindfulness_diary' })
                    .order('date', { ascending: false });
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            return (data as unknown as ClinicalRecord[]).map(record => ({
                ...record,
                toolType: 'mindfulness_diary'
            })) as MindfulnessDiaryRecord[];

        } catch (error) {
 addToast('Erro ao carregar Diário de Valores.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['mindfulness_diary', patientId],
        queryFn: fetchMindfulnessLogsFn,
        enabled: !!patientId,
    });

    const createMindfulnessLog = async (
        patientId: string,
        authorId: string,
        data: { feeling: number; valuesAlignment: number; notes?: string }
    ): Promise<boolean> => {
        // Blindagem: modo simulação não persiste dados clínicos
        if (isSimulation) {
 addToast('Modo Simulação: Os dados não serão salvos no prontuário real.', 'info');
            return true;
        }

        try {
            let error;
            if (isMagic) {
                const result = await supabase.rpc('insert_portal_clinical_record', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_content: {
                        feeling: data.feeling,
                        valuesAlignment: data.valuesAlignment,
                        notes: data.notes || ''
                    },
                    p_metadata: {
                        toolType: 'mindfulness_diary'
                    }
                });
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .insert({
                        patient_id: patientId,
                        author_id: authorId,
                        date: new Date().toISOString(),
                        type: 'clinical_tool',
                        content: {
                            feeling: data.feeling,
                            valuesAlignment: data.valuesAlignment,
                            notes: data.notes || ''
                        },
                        metadata: {
                            toolType: 'mindfulness_diary'
                        }
                    });
                error = result.error;
            }

            if (error) throw error;
 addToast('Registro do Diário salvo!', 'success');
            await queryClient.invalidateQueries({ queryKey: ['mindfulness_diary', patientId] });
            return true;
        } catch (error) {
 addToast('Erro ao salvar registro.', 'error');
            return false;
        }
    };

    return { records, createMindfulnessLog, loading: isLoading };
};

// --- Crisis Regulation Telemetry Hook ---
export const useCrisisRegulation = () => {
    const { isSimulation, isMagic, magicTokenVersion } = usePortalUser();

    const logCrisisRegulation = async (
        patientId: string,
        authorId: string,
        toolName: string,
        details?: string,
        durationSeconds?: number
    ): Promise<boolean> => {
        // Blindagem: modo simulação não persiste dados clínicos
        if (isSimulation) {
            return true;
        }

        try {
            let error;
            if (isMagic) {
                const result = await supabase.rpc('insert_portal_clinical_record', {
                    p_patient_id: patientId,
                    p_token_version: magicTokenVersion,
                    p_content: {
                        toolName,
                        details,
                        durationSeconds
                    },
                    p_metadata: {
                        toolType: 'crisis_regulation'
                    }
                });
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .insert({
                        patient_id: patientId,
                        author_id: authorId,
                        date: new Date().toISOString(),
                        type: 'clinical_tool',
                        content: {
                            toolName,
                            details,
                            durationSeconds
                        },
                        metadata: {
                            toolType: 'crisis_regulation'
                        }
                    });
                error = result.error;
            }

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error logging crisis regulation:', error);
            return false;
        }
    };

    return { logCrisisRegulation };
};
