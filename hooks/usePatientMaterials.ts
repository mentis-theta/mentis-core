import { supabase } from '../services/supabaseClient';
import { PatientMaterial, LibraryItem } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const usePatientMaterials = (patientId?: string) => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Therapists fetch materials they assigned to a specific patient
    const { data: assignedMaterials = [], isLoading: loadingAssigned } = useQuery({
        queryKey: ['patient_materials', 'therapist', patientId],
        queryFn: async (): Promise<PatientMaterial[]> => {
            if (!currentUser || !patientId) return [];
            const { data, error } = await supabase
                .from('patient_materials')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as PatientMaterial[];
        },
        enabled: !!currentUser && !!patientId,
    });

    // Patients fetch their own assigned materials
    const { data: myMaterials = [], isLoading: loadingMyMaterials } = useQuery({
        queryKey: ['my_materials', currentUser?.id],
        queryFn: async (): Promise<PatientMaterial[]> => {
            if (!currentUser) return [];
            const { data, error } = await supabase
                .from('patient_materials')
                .select('*')
                .eq('patient_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as PatientMaterial[];
        },
        enabled: !!currentUser,
    });

    // Therapist assigns a material to a patient
    const assignMaterialMutation = useMutation({
        mutationFn: async ({ libraryItem, targetPatientId }: { libraryItem: LibraryItem, targetPatientId: string }) => {
            if (!currentUser) throw new Error("No user");

            const { data, error } = await supabase
                .from('patient_materials')
                .insert({
                    patient_id: targetPatientId,
                    therapist_id: currentUser.id,
                    title: libraryItem.title,
                    description: libraryItem.description,
                    category: libraryItem.category,
                    url: libraryItem.url,
                    cover_url: libraryItem.coverUrl,
                })
                .select()
                .single();

            if (error) throw error;
            return data as PatientMaterial;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['patient_materials', 'therapist', variables.targetPatientId] });
            addToast('Material enviado ao paciente com sucesso!', 'success');
        },
        onError: (err) => {
            console.error('Error assigning material:', err);
            addToast('Erro ao enviar material.', 'error');
        }
    });

    // Patient marks material as read
    const markAsReadMutation = useMutation({
        mutationFn: async (materialId: string) => {
            if (!currentUser) throw new Error("No user");
            
            const { error } = await supabase
                .from('patient_materials')
                .update({ read_at: new Date().toISOString() })
                .eq('id', materialId);

            if (error) throw error;
            return materialId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my_materials', currentUser?.id] });
        }
    });

    return {
        assignedMaterials,
        loadingAssigned,
        myMaterials,
        loadingMyMaterials,
        assignMaterial: async (libraryItem: LibraryItem, targetPatientId: string) => {
            return await assignMaterialMutation.mutateAsync({ libraryItem, targetPatientId }).then(() => true).catch(() => false);
        },
        markAsRead: async (materialId: string) => {
            return await markAsReadMutation.mutateAsync(materialId).then(() => true).catch(() => false);
        }
    };
};
