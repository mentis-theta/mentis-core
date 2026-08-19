import { supabase } from '../services/supabaseClient';
import { InventoryRecord } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientMemoryService } from '../services/patientMemoryService';
import { useCrypto } from '@/contexts/CryptoContext';
import * as cryptoService from '@/services/cryptoService';

export const useInventories = (patientId?: string) => {
 const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { masterKey } = useCrypto();

    const fetchInventoriesFn = async (): Promise<InventoryRecord[]> => {
        if (!patientId || !masterKey) return [];
        try {
            const { data, error } = await supabase
                .from('clinical_records')
                .select('*')
                .eq('patient_id', patientId)
                .eq('type', 'clinical_tool')
                .contains('metadata', { toolType: 'inventory' })
                .order('date', { ascending: true }); // Ascending for chart chronological order

            if (error) throw error;

            // Unpack private key
            const encryptedPrivateKey = localStorage.getItem('mentis_private_key');
            let privateKeyStr: string | null = null;
            if (encryptedPrivateKey) {
                try {
                    privateKeyStr = cryptoService.decryptData(encryptedPrivateKey, masterKey);
                } catch (e) {
                    console.error('Failed to unwrap private key', e);
                }
            }

            const results = await Promise.all((data as any[]).map(async (record) => {
                let decryptedRecord = { ...record };
                
                if (record.metadata?.encrypted_payload && privateKeyStr) {
                    try {
                        const payload = await cryptoService.decryptAsymmetric<any>(record.metadata.encrypted_payload, privateKeyStr);
                        // Repopulate plaintext fields for the frontend
                        decryptedRecord.metadata.score = payload.score;
                        decryptedRecord.metadata.severity = payload.severity;
                        decryptedRecord.content.responses = payload.responses;
                    } catch (e) {
                        console.error('Failed to decrypt inventory payload', e);
                        decryptedRecord.metadata.score = 0;
                        decryptedRecord.content.notes = '⚠️ Erro ao descriptografar dados desta avaliação.';
                    }
                }

                return {
                    ...decryptedRecord,
                    toolType: 'inventory'
                } as InventoryRecord;
            }));

            return results;

        } catch (error) {
 console.error('Error fetching inventory logs:', error);
 addToast('Erro ao carregar os Inventários.', 'error');
            return [];
        }
    };

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['inventories', patientId, masterKey],
        queryFn: fetchInventoriesFn,
        enabled: !!patientId && !!masterKey,
    });

    const createInventoryLog = async (
        patientId: string,
        authorId: string,
        data: {
            scaleName: string;
            score: number;
            severity?: string;
            notes?: string;
            date?: string;
            session_id?: string;
        }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .insert({
                    patient_id: patientId,
                    author_id: authorId,
                    date: data.date || new Date().toISOString(),
                    type: 'clinical_tool',
                    content: {
                        notes: data.notes || '',
                    },
                    metadata: {
                        toolType: 'inventory',
                        scaleName: data.scaleName,
                        score: data.score,
                        severity: data.severity,
                        session_id: data.session_id || undefined,
                    }
                });

            if (error) throw error;

            // -> Injeção Mecânica no Cérebro do Paciente (Knowledge Graph)
            try {
                const severityText = data.severity ? ` (Severidade: ${data.severity})` : '';
                const notesText = data.notes ? ` Observações: ${data.notes}` : '';
                const memoryText = `Avaliação Psicométrica: ${data.scaleName}. Escore: ${data.score}${severityText}.${notesText}`;

                await patientMemoryService.upsertClinicalFacts([{
                    id: crypto.randomUUID(),
                    patient_id: patientId,
                    text: memoryText,
                    type: 'Psychometrics',
                    source_refs: [],
                    source_type: 'psychometrics',
                    status: 'approved'
                }]);
            } catch (memoryError) {
                console.error('Falha ao salvar psicometria na memória do paciente:', memoryError);
                // Erro silencioso para não bloquear o salvamento do inventário
            }

            addToast('Aferição adicionada ao gráfico!', 'success');
            queryClient.invalidateQueries({ queryKey: ['inventories', patientId] });
            return true;
        } catch (error) {
 console.error('Error creating inventory log:', error);
 addToast('Erro ao salvar registro do Inventário.', 'error');
            return false;
        }
    };

    const deleteInventoryLog = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clinical_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
 addToast('Registro excluído com sucesso.', 'success');
            queryClient.invalidateQueries({ queryKey: ['inventories', patientId] });
            return true;
        } catch (error) {
 console.error('Error deleting inventory log:', error);
 addToast('Erro ao excluir registro.', 'error');
            return false;
        }
    };

    return {
        records,
        createInventoryLog,
        deleteInventoryLog,
        loading: isLoading
    };
};
