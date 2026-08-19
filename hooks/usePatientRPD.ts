import { useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { usePortalUser } from './usePortalUser';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { RPDRecord, RPDContent, RPDMetadata } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientMemoryService } from '@/services/patientMemoryService';

export const usePatientRPD = () => {
    const { patient, isSimulation, isMagic, magicTokenVersion } = usePortalUser();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const fetchMyRPDsFn = async () => {
        if (!patient) return [];
        
        let data;
        let error;
        
        if (isMagic) {
            const result = await supabase.rpc('get_portal_clinical_records', {
                p_patient_id: patient.id,
                p_token_version: magicTokenVersion,
                p_tool_type: 'rpd'
            });
            data = result.data;
            error = result.error;
        } else {
            const result = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patient.id)
                .eq('type', 'clinical_tool')
                .contains('metadata', { toolType: 'rpd' })
                .order('date', { ascending: false });
            data = result.data;
            error = result.error;
        }

        if (error) throw error;
        return data as unknown as RPDRecord[];
    };

    const { data: rpds = [], isLoading: loading } = useQuery({
        queryKey: ['patient_rpds', patient?.id],
        queryFn: fetchMyRPDsFn,
        enabled: !!patient?.id,
        staleTime: 1000 * 60 * 5,
    });

    const createMutation = useMutation({
        mutationKey: ['create_rpd', patient?.id],
        mutationFn: async ({ content, metadata }: any) => {
            const authorId = currentUser?.id || patient!.id;
            
            let data;
            let error;
            
            if (isMagic) {
                const result = await supabase.rpc('insert_portal_clinical_record', {
                    p_patient_id: patient!.id,
                    p_token_version: magicTokenVersion,
                    p_content: content,
                    p_metadata: { ...metadata, toolType: 'rpd' }
                });
                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('clinical_records')
                    .insert({
                        patient_id: patient!.id,
                        author_id: authorId,
                        date: new Date().toISOString(),
                        type: 'clinical_tool',
                        content,
                        metadata: {
                            ...metadata,
                            toolType: 'rpd'
                        }
                    }).select().single();
                data = result.data;
                error = result.error;
            }

            if (error) throw error;
            return data;
        },
        onMutate: async ({ content, metadata }) => {
            await queryClient.cancelQueries({ queryKey: ['patient_rpds', patient?.id] });
            const previous = queryClient.getQueryData(['patient_rpds', patient?.id]);

            const authorId = currentUser?.id || patient!.id;
            const optimisticResult: any = {
                id: `temp-${Date.now()}`,
                patient_id: patient!.id,
                author_id: authorId,
                date: new Date().toISOString(),
                type: 'clinical_tool',
                content,
                metadata: {
                    ...metadata,
                    toolType: 'rpd'
                },
                created_at: new Date().toISOString()
            };

            queryClient.setQueryData(['patient_rpds', patient?.id], (old: any) => [optimisticResult, ...(old || [])]);
            return { previous };
        },
        onError: (err, variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['patient_rpds', patient?.id], context.previous);
            }
 console.error('Error creating RPD:', err);
 addToast('Erro ao salvar registro.', 'error');
        },
        onSuccess: () => {
 addToast('Registro salvo com sucesso!', 'success');
            addToast('Registro salvo com sucesso!', 'success');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['patient_rpds', patient?.id] });
        }
    });

    const EMOTION_MAP: Record<string, string> = {
        'sadness': 'Tristeza',
        'anxiety': 'Ansiedade',
        'anger': 'Raiva',
        'joy': 'Alegria',
        'neutral': 'Neutro'
    };

    const createRPD = async (content: RPDContent, metadata: RPDMetadata) => {
        if (!patient) return false;

        // Blindagem: modo simulação não persiste dados clínicos
        if (isSimulation) {
            addToast('Modo Simulação: Os dados não serão salvos no prontuário real.', 'info');
            return true;
        }

        try {
            await createMutation.mutateAsync({ content, metadata });
            
            // --> Inserção Mecânica no Knowledge Graph
            try {
                const emotionLabel = EMOTION_MAP[metadata.emotion] || metadata.emotion;
                const text = `Paciente relatou sentimento de ${emotionLabel} (Intensidade: ${metadata.intensity}%) na seguinte situação: "${content.situation}". Pensamento automático associado: "${content.thought}".`;
                
                if (isMagic) {
                    await supabase.rpc('insert_portal_memory_fact', {
                        p_patient_id: patient.id,
                        p_token_version: magicTokenVersion,
                        p_text: text,
                        p_type: 'Observation',
                        p_source_type: 'other'
                    });
                } else {
                    await patientMemoryService.upsertClinicalFacts([{
                        id: crypto.randomUUID(),
                        patient_id: patient.id,
                        text,
                        type: 'Observation',
                        source_refs: [],
                        source_type: 'other',
                        status: 'approved'
                    }]);
                }
            } catch (memoryError) {
                console.error('Falha ao injetar fato na memória via RPD:', memoryError);
                // Não bloqueamos o fluxo se a memória falhar
            }

            return true;
        } catch {
            return false;
        }
    };

    return {
        rpds,
        loading,
        createRPD,
        refresh: () => queryClient.invalidateQueries({ queryKey: ['patient_rpds', patient?.id] })
    };
};
