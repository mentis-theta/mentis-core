import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '@/contexts/ToastContext';

// Tipagens alinhadas com o Backend (ReasoningEngine)
export interface Provenance {
  chunk_id: string;
  sentenca_exata: string;
  documento_origem: string; 
  pagina_ou_secao?: string;
  versao_documento?: string;
}

export interface EvidenceNode {
  sintoma_ou_fator: string;
  hipotese_clinica: string;
  explicacao_baseada_nas_evidencias: string;
  contraevidencias: string[];
  contradições_criticas?: string[];
  necessidade_avaliacao: string;
  confidence_score: number;
  provenance: Provenance[]; 
}

export interface ClinicalReasoningState {
  grafo_evidencias: EvidenceNode[];
  riscos_identificados: string[];
  informacoes_ausentes_checklist: string[];
  confidence_score: number;
}

export interface MentisResponse {
  state: ClinicalReasoningState;
  narrative: string;
}

export const useMentisReasoning = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MentisResponse | null>(null);
  const { addToast } = useToast();

  const analyzeCase = async (query: string) => {
    if (!query.trim()) {
      addToast('O relato não pode estar vazio.', 'error');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Invocando a Supabase Edge Function recém-criada
      const { data, error } = await supabase.functions.invoke<MentisResponse>('clinical-reasoning', {
        body: { query }
      });

      if (error) {
        throw new Error(error.message || 'Falha ao conectar com o Mentis Copilot.');
      }

      if (data) {
        setResult(data);
      }
      
    } catch (err: any) {
      console.error('[Mentis UI] Erro na análise clínica:', err);
      addToast(err.message || 'Falha na Análise', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => setResult(null);

  const submitClinicalFeedback = async (queryText: string, hipotese: string, avaliacao: string, motivo?: string) => {
    try {
      const { error } = await supabase
        .from('clinical_rag_feedback')
        .insert([{
          query_text: queryText,
          hipotese: hipotese,
          avaliacao: avaliacao,
          motivo_discordancia: motivo || null
        }]);
      
      if (error) {
        console.error('Erro ao registrar feedback:', error);
      } else {
        addToast('Obrigado por ajudar a calibrar o motor Mentis.', 'success');
      }
    } catch (err) {
      console.error('Erro de rede ao registrar feedback:', err);
    }
  };

  return {
    analyzeCase,
    clearAnalysis,
    submitClinicalFeedback,
    result,
    isLoading
  };
};
