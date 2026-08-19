import { supabase } from '../services/supabaseClient';
import type { CognitiveTaskRecord, CognitiveTaskResult, CognitiveTaskType } from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { patientMemoryService } from '../services/patientMemoryService';
import { useCrypto } from '@/contexts/CryptoContext';
import * as cryptoService from '@/services/cryptoService';

const TASK_LABELS: Record<CognitiveTaskType, string> = {
  stroop: 'Stroop (Atenção Seletiva)',
  corsi: 'Corsi (Memória de Trabalho)',
  riasec: 'RIASEC (Orientação Vocacional)',
};

export const useCognitiveTask = (patientId?: string, taskTypeFilter?: CognitiveTaskType) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { masterKey } = useCrypto();

  const fetchResults = async (): Promise<CognitiveTaskRecord[]> => {
    if (!patientId || !masterKey) return [];
    try {
      let query = supabase
        .from('clinical_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('type', 'clinical_tool')
        .contains('metadata', { toolType: 'cognitive_task' });

      // Filtra por tipo de tarefa se especificado
      if (taskTypeFilter) {
        query = query.contains('metadata', { taskType: taskTypeFilter });
      }

      const { data, error } = await query.order('date', { ascending: true });
      if (error) throw error;

      // Descriptografar payloads se necessário
      const encryptedPrivateKey = localStorage.getItem('mentis_private_key');
      let privateKeyStr: string | null = null;
      if (encryptedPrivateKey) {
        try {
          privateKeyStr = cryptoService.decryptData(encryptedPrivateKey, masterKey);
        } catch (e) {
          console.error('Failed to unwrap private key for cognitive tasks', e);
        }
      }

      const results = await Promise.all((data as any[]).map(async (record) => {
        let decryptedRecord = { ...record };

        if (record.metadata?.encrypted_payload && privateKeyStr) {
          try {
            const payload = await cryptoService.decryptAsymmetric<any>(record.metadata.encrypted_payload, privateKeyStr);
            decryptedRecord.content = payload.content;
            decryptedRecord.metadata.summary = payload.summary;
          } catch (e) {
            console.error('Failed to decrypt cognitive task payload', e);
            decryptedRecord.metadata.summary = {};
          }
        }

        return {
          ...decryptedRecord,
          toolType: 'cognitive_task',
        } as CognitiveTaskRecord;
      }));

      return results;
    } catch (error) {
      console.error('Error fetching cognitive task results:', error);
      addToast('Erro ao carregar resultados de testes cognitivos.', 'error');
      return [];
    }
  };

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['cognitive_tasks', patientId, taskTypeFilter, masterKey],
    queryFn: fetchResults,
    enabled: !!patientId && !!masterKey,
  });

  const createTaskResult = async (
    patientId: string,
    authorId: string,
    result: CognitiveTaskResult,
    sessionId?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clinical_records')
        .insert({
          patient_id: patientId,
          author_id: authorId,
          date: result.completedAt || new Date().toISOString(),
          type: 'clinical_tool',
          content: {
            rawEvents: result.events,
            deviceContext: result.deviceContext,
            seed: result.seed,
          },
          metadata: {
            toolType: 'cognitive_task',
            taskType: result.taskType,
            summary: result.summary,
            session_id: sessionId || undefined,
          },
        });

      if (error) throw error;

      // Injetar fato clínico no Knowledge Graph do paciente
      try {
        const label = TASK_LABELS[result.taskType] || result.taskType;
        const summaryParts = Object.entries(result.summary)
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');

        const memoryText = `Teste Cognitivo: ${label}. Resultados: ${summaryParts}.`;

        await patientMemoryService.upsertClinicalFacts([{
          id: crypto.randomUUID(),
          patient_id: patientId,
          text: memoryText,
          type: 'Psychometrics',
          source_refs: [],
          source_type: 'psychometrics',
          status: 'approved',
        }]);
      } catch (memoryError) {
        console.error('Falha ao salvar teste cognitivo na memória do paciente:', memoryError);
        // Erro silencioso — não bloqueia o salvamento
      }

      addToast(`Resultado do ${TASK_LABELS[result.taskType]} salvo com sucesso!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['cognitive_tasks', patientId] });
      return true;
    } catch (error) {
      console.error('Error saving cognitive task result:', error);
      addToast('Erro ao salvar resultado do teste cognitivo.', 'error');
      return false;
    }
  };

  const deleteTaskResult = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clinical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('Resultado excluído com sucesso.', 'success');
      queryClient.invalidateQueries({ queryKey: ['cognitive_tasks', patientId] });
      return true;
    } catch (error) {
      console.error('Error deleting cognitive task result:', error);
      addToast('Erro ao excluir resultado.', 'error');
      return false;
    }
  };

  return {
    records,
    createTaskResult,
    deleteTaskResult,
    loading: isLoading,
  };
};
