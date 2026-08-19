import { supabase } from './supabaseClient.ts';

export interface AiLogPayload {
  actionName: string;
  modelUsed: string;
  statusCode: number;
  errorReason?: string;
  latencyMs: number;
  requestPayload: any;
  responsePayload?: any;
}

/**
 * Registra as requisições de IA no banco de dados para auditoria.
 * Operação "Fail-safe": falha silenciosamente e nunca quebra o app se o insert falhar.
 */
export const logApiCall = async (logData: AiLogPayload) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // A inserção ocorre de forma assíncrona ("fire and forget" do ponto de vista da UI)
    await supabase.from('ai_api_logs').insert({
      action_name: logData.actionName,
      model_used: logData.modelUsed,
      status_code: logData.statusCode,
      error_reason: logData.errorReason,
      latency_ms: logData.latencyMs,
      request_payload: logData.requestPayload,
      response_payload: logData.responsePayload,
      user_id: userId || null,
    });
  } catch (error) {
    // Fail-safe silencioso: Apenas loga no console interno, não derruba o app
    console.error('[AI Logger] Falha ao registrar log de auditoria:', error);
  }
};
