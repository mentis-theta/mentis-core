import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

export interface TelemetryUserMetrics {
    author_id: string;
    author_name: string | null;
    total_requests: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    avg_latency_ms: number;
    estimated_cost_usd: number;
    models_used: string;
}

export const useAITelemetry = (startDate?: Date, endDate?: Date) => {
    // Default to current month if not provided
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    return useQuery({
        queryKey: ['ai_telemetry_metrics', start.toISOString(), end.toISOString()],
        queryFn: async (): Promise<TelemetryUserMetrics[]> => {
            const { data, error } = await supabase.rpc('get_ai_cost_metrics', {
                p_start_date: start.toISOString(),
                p_end_date: end.toISOString()
            });
            
            if (error) {
                console.error("Erro ao buscar métricas de IA:", error);
                throw new Error("Não foi possível carregar a telemetria.");
            }
            
            // The RPC returns a JSON array of metrics
            return (data as TelemetryUserMetrics[]) || [];
        },
        staleTime: 60 * 1000, // 1 minute
        retry: 1
    });
};
