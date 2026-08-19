import { supabase } from './supabaseClient';
import { calculateScore, getSeverity, type ScaleName } from '@/utils/assessmentScales';
import * as cryptoService from './cryptoService';

export interface AssessmentLink {
  id: string;
  token: string;
  patient_id: string;
  psychologist_id: string;
  scale_name: ScaleName;
  session_id: string | null;
  status: 'pending' | 'completed' | 'expired';
  responses: number[] | null;
  score: number | null;
  severity: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

/**
 * Gera um token único para o link de avaliação.
 * Usa crypto.randomUUID() disponível em browsers modernos.
 */
function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Cria um novo link de avaliação para o paciente.
 */
export async function createAssessmentLink(
  patientId: string,
  psychologistId: string,
  scaleName: ScaleName,
  sessionId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const token = generateToken();

    const { error } = await supabase
      .from('assessment_links')
      .insert({
        token,
        patient_id: patientId,
        psychologist_id: psychologistId,
        scale_name: scaleName,
        session_id: sessionId || null,
        status: 'pending',
      });

    if (error) throw error;

    return { success: true, token };
  } catch (error: any) {
    console.error('Error creating assessment link:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca um assessment link pelo token.
 * Usado pela página pública para carregar o formulário.
 */
export async function getAssessmentByToken(
  token: string
): Promise<AssessmentLink | null> {
  try {
    const { data, error } = await supabase
      .from('assessment_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error) throw error;
    return data as AssessmentLink;
  } catch (error) {
    console.error('Error fetching assessment by token:', error);
    return null;
  }
}

/**
 * Submete as respostas do paciente.
 * Calcula score + severidade no frontend, e chama a RPC server-side
 * que faz a validação do token, atualiza assessment_links e insere em clinical_records
 * com SECURITY DEFINER (bypassa RLS de forma segura).
 */
export async function submitAssessment(
  token: string,
  responses: (number | null)[]
): Promise<{ success: boolean; score?: number; severity?: string; error?: string }> {
  try {
    // 1. Buscar o link para calcular score/severity no frontend
    const link = await getAssessmentByToken(token);
    if (!link) return { success: false, error: 'Link não encontrado.' };
    if (link.status === 'completed') return { success: false, error: 'Esta avaliação já foi respondida.' };

    if (new Date(link.expires_at) < new Date()) {
      return { success: false, error: 'Este link expirou.' };
    }

    // 2. Calcular score e severidade no TypeScript (suporta todas as escalas)
    const scaleNameLiteral = link.scale_name as ScaleName;
    const score = calculateScore(scaleNameLiteral, responses);
    const { label: severity } = getSeverity(scaleNameLiteral, score, responses);

    // 3. Buscar Chave Pública do Terapeuta
    const { data: therapistPubKey, error: keyError } = await supabase.rpc('get_public_key_by_assessment_token', {
      p_token: token
    });

    if (keyError || !therapistPubKey) {
      return { success: false, error: 'O terapeuta não possui chaves de criptografia configuradas.' };
    }

    // 4. Detecção de item crítico (PHQ-9 Pergunta 9)
    let criticalFlagged = false;
    let criticalValue = 0;
    if (scaleNameLiteral === 'PHQ-9') {
      criticalValue = responses[8] || 0;
      criticalFlagged = criticalValue > 0;
    }

    // 5. Criptografar o payload com RSA-OAEP
    const payload = {
      score,
      severity,
      responses
    };
    
    const encryptedPayload = await cryptoService.encryptAsymmetric(payload, therapistPubKey);

    // 6. Chamar RPC server-side (SECURITY DEFINER — bypassa RLS com segurança)
    const { data, error } = await supabase.rpc('submit_public_assessment_v2', {
      p_token: token,
      p_encrypted_payload: encryptedPayload,
      p_critical_flagged: criticalFlagged,
      p_critical_value: criticalValue
    });

    if (error) throw error;

    // A RPC retorna JSONB com { success, score, severity, error }
    const result = data as { success: boolean; score?: number; severity?: string; error?: string };

    if (!result.success) {
      return { success: false, error: result.error || 'Erro ao processar avaliação.' };
    }

    return { success: true, score, severity };
  } catch (error: any) {
    console.error('Error submitting assessment:', error);
    return { success: false, error: error.message };
  }
}
