
import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { ClinicalRecord, ClinicalRecordType, JSONContent } from '@/types';

export const useClinicalRecords = () => {
    const [records, setRecords] = useState<ClinicalRecord[]>([]);
    const [loading, setLoading] = useState(false);
 const { addToast } = useToast();
    const { currentUser } = useAuth();
    const confirm = useConfirm();

    const fetchRecords = useCallback(async (patientId: string) => {
        if (!patientId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patientId)
                .order('date', { ascending: false });

            if (error) throw error;
            setRecords(data as ClinicalRecord[]);
        } catch (error) {
 console.error('Error fetching clinical records:', error);
 addToast('Erro ao carregar prontuário.', 'error');
        } finally {
            setLoading(false);
        }
 }, [addToast]);

    const getBySessionId = useCallback(async (sessionId: string) => {
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle();

            if (error) throw error;
            return data as ClinicalRecord | null;
        } catch (error) {
 console.error('Error fetching record by session ID:', error);
            return null;
        }
    }, []);

    const createRecord = useCallback(async (
        patientId: string,
        sessionId: string | undefined,
        content: JSONContent,
        type: ClinicalRecordType = 'session_summary',
        metadata: any = {},
        showToast: boolean = true
    ) => {
        if (!currentUser) return null;

        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .insert({
                    patient_id: patientId,
                    author_id: currentUser.id,
                    session_id: sessionId,
                    content,
                    type,
                    metadata,
                    date: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            setRecords(prev => [data as ClinicalRecord, ...prev]);
            if (showToast) {
 addToast('Registro salvo.', 'success');
            }
            return data as ClinicalRecord;
        } catch (error) {
 console.error('Error creating record:', error);
            if (showToast) {
 addToast('Erro ao salvar registro.', 'error');
            }
            return null;
        }
 }, [currentUser, addToast]);

    const updateRecord = useCallback(async (recordId: string, updates: Partial<ClinicalRecord>) => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .update(updates)
                .eq('id', recordId);

            if (error) throw error;

            setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
 addToast('Registro atualizado.', 'success');
        } catch (error) {
 console.error('Error updating record:', error);
 addToast('Erro ao atualizar registro.', 'error');
        }
 }, [addToast]);

    const deleteRecord = useCallback(async (recordId: string) => {
        const isConfirmed = await confirm({
            title: "Excluir Registro",
            message: "Tem certeza que deseja excluir este registro permanentemente?",
            confirmText: "Sim, excluir"
        });
        if (!isConfirmed) return;
        try {
            const { error } = await supabase.from('clinical_records').delete().eq('id', recordId);
            if (error) throw error;
            setRecords(prev => prev.filter(r => r.id !== recordId));
 addToast('Registro excluído.', 'success');
        } catch (error) {
 console.error('Error deleting record:', error);
 addToast('Erro ao excluir registro.', 'error');
        }
 }, [addToast, confirm]);

    return {
        records,
        loading,
        fetchRecords,
        createRecord,
        updateRecord,
        deleteRecord,
        getBySessionId
    };
};
