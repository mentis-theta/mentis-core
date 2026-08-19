import { supabase } from './supabaseClient.ts';
import { Patient, Session } from '../types.ts';
import { callAIProxy } from './geminiService.ts';
import { AI_MODELS } from '../config/ai_models.ts';
import { anonymizeClinicalText } from '../utils/anonymizer.ts';

export const generateLiveSummary = async (patient: Patient, masterKey: string): Promise<string> => {
    // 1. Fetch all sessions for this patient
    const { data: sessions, error } = await supabase
        .from('patient_sessions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: true }); // chronological order

    if (error) {
        throw new Error(`Erro ao buscar sessões para Live Summary: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
        return "Nenhum histórico disponível para este paciente.";
    }

    // 2. Format history for AI
    const historyText = sessions.map((s: any) => `
    [Data: ${new Date(s.date).toLocaleDateString()}]
    Status: ${s.status}
    Tags: ${s.tags ? s.tags.map((t: any) => t.text).join(', ') : 'N/A'}
    Anotações: ${s.notes || ''}
    `).join('\n---\n');

    // 3. Anonymize
    const safeHistory = anonymizeClinicalText(historyText, patient);

    // 4. Prompt for Live Summary
    const systemPrompt = `Você é um Psiquiatra e Psicólogo Clínico Sênior criando o "Prontuário Vivo" (Resumo Executivo) de um paciente.
Sua missão é sintetizar todo o histórico fornecido em um texto coeso, denso e clinicamente útil que servirá como a "bula" do paciente.
Este é um resumo executivo imutável e condensado. Ele DEVE ter o limite estrito de no máximo 400 palavras. Sintetize impiedosamente a evolução do paciente.

Estruture seu resumo com:
1. Perfil e Queixa Principal
2. Gatilhos Mapeados e Padrões Comportamentais
3. Hipóteses Diagnósticas (Considere o contexto socioeconômico e cultural brasileiro. Não patologize sofrimentos inerentes à realidade social e considere luto/estresse adaptativo antes de sugerir CID/DSM).
4. Dinâmica Familiar/Relacional
5. Metas Terapêuticas Ativas

Mantenha o tom estritamente clínico e objetivo. Se houver informações de Risco de Vida (Suicídio/Violência), destaque-as no topo.`;

    // 5. Call AI
    const response = await callAIProxy('generate_content', {
        model: AI_MODELS.REASONING_TASKS,
        contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nHistórico do Paciente (Anonimizado):\n${safeHistory}` }] }
        ],
        config: {
            temperature: 0.2,
        }
    });

    const newSummary = response.text || '';

    // 6. Save to Supabase
    if (newSummary) {
        const { error: updateError } = await supabase
            .from('patients')
            .update({ live_summary: newSummary })
            .eq('id', patient.id);

        if (updateError) {
            console.error("Falha ao salvar Live Summary no Supabase", updateError);
            throw new Error(`Falha ao salvar Live Summary: ${updateError.message}`);
        }
    }

    return newSummary;
};
