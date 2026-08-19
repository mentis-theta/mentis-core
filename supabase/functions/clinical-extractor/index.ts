// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Importação direta do código isomórfico (Deno cuidará do bundling local no Supabase CLI)
import { runExtractorPipeline } from '../../../services/extractor/index.ts';

declare const Deno: any;

serve(async (req: any) => {
    try {
        const payload = await req.json();
        const sessionRecord = payload.record;

        if (!sessionRecord || !sessionRecord.id) {
            return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 });
        }

        const sessionId = sessionRecord.id;
        const patientId = sessionRecord.patient_id;

        // Configura cliente Supabase (usando Service Role para bypassar RLS em background)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // MUST use service_role!

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase Configuração Ausente na Edge Function.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ==========================================
        // Mitigation 2: Race Condition Lock (Idempotency)
        // ==========================================
        // Usamos um UPDATE condicional estrito para simular um "Check-and-Set"
        // Se a sessão já estiver 'processing' ou 'completed', nada é alterado e nenhuma linha é retornada.
        const { data: lockData, error: lockError } = await supabase
            .from('sessions')
            .update({ extraction_status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .in('extraction_status', ['pending', 'failed'])
            .select();

        if (lockError) throw lockError;

        if (!lockData || lockData.length === 0) {
            console.log(`[Idempotência] Sessão ${sessionId} já está em processamento ou concluída. Ignorando.`);
            return new Response(JSON.stringify({ message: 'Skipped - already processing' }), { status: 200 });
        }

        console.log(`[Extrator] Iniciando processamento da sessão ${sessionId}`);

        // A Pipeline isomórfica lida com a lógica de extração
        // Precisamos passar o array de sessão como o pipeline espera.
        const extractionResult = await runExtractorPipeline(patientId, [sessionRecord]);

        // Insere as observações construídas
        if (extractionResult.observations && extractionResult.observations.length > 0) {
            const { error: insertError } = await supabase
                .from('clinical_observations')
                .insert(extractionResult.observations.map((obs: any) => ({
                    ...obs,
                    session_id: sessionId // Vinculando a observação explícitamente a esta sessão
                })));
            
            if (insertError) throw insertError;
        }

        // Recupera os procedimentos técnicos extraídos (se implementado pelo LLM na string de procedimentos)
        // Aqui assumiremos que o Extractor devolve ou nós criamos um campo.
        // Para simplificar, marcaremos apenas como completado.
        const { error: updateError } = await supabase
            .from('sessions')
            .update({ 
                extraction_status: 'completed', 
                updated_at: new Date().toISOString() 
            })
            .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log(`[Extrator] Sessão ${sessionId} finalizada com sucesso.`);
        return new Response(JSON.stringify({ success: true, count: extractionResult.observations.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('[Extrator Error]', error);

        // Em caso de falha, tentamos reverter o status para 'failed' ou 'failed_size_limit'
        try {
            const reqData = await req.clone().json();
            if (reqData?.record?.id) {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                const isSizeLimit = error?.message?.includes('SIZE_LIMIT_EXCEEDED');
                await supabase.from('sessions')
                    .update({ extraction_status: isSizeLimit ? 'failed_size_limit' : 'failed' })
                    .eq('id', reqData.record.id);
            }
        } catch (e) {
            // Ignora erro de reversão
        }

        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
