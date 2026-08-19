import { supabase } from './supabaseClient';
import { parseLLMJSON } from '../utils/aiUtils';
import { TEXT_ANALYSIS_PROMPT } from './prompts';
import { AI_MODELS } from '../config/ai_models';

export interface AudioAnalysisResult {
    resumo_sessao?: string;
    mecanismos_enfrentamento?: string;
    evolucao_clinica?: string;
}

export type AudioProgressState = { 
    step: 'chunking' | 'transcribing' | 'waiting_rate_limit' | 'analyzing', 
    currentChunk?: number, 
    totalChunks?: number, 
    progress?: number, 
    message?: string 
};

// Helper centralizado para chamar nossa nova Edge Function (Segurança de Chaves)
import { showGlobalToast } from '../contexts/ToastContext.tsx';

const callAIProxy = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { action, payload }
    });

    if (error) {
        console.error(`Erro ao invocar a Edge Function ai-proxy (${action}):`, error);
        showGlobalToast(`Erro na transcrição de áudio: ${error.message || 'Falha na comunicação'}`, 'error');
        throw error;
    }
    
    return data; 
};

/**
 * Transcribe a single audio chunk via Edge Function (Groq)
 */
export async function transcribeAudioChunk(audioBlob: Blob): Promise<string> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Convert Blob to Base64
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });

    while (attempt < MAX_RETRIES) {
        try {
            const response = await callAIProxy('transcribe_audio', {
                audioBase64: base64,
                mimeType: audioBlob.type || 'audio/webm'
            });

            return response.text || "";
        } catch (error: unknown) {
            attempt++;
            
            const isRateLimit = JSON.stringify(error).includes('429');
            if (isRateLimit) {
                if (attempt >= MAX_RETRIES) {
                    throw new Error(`Rate Limit excedido após ${MAX_RETRIES} tentativas.`);
                }
                const waitTime = 3000 * Math.pow(2, attempt); 
                console.warn(`⚠️ Rate Limit. Tentativa ${attempt} falhou. Aguardando ${waitTime/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            console.error('❌ AI Proxy Transcription Error:', error);
            throw new Error(`Falha na transcrição: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error("Falha desconhecida na transcrição.");
}

/**
 * Analisa o texto completo da transcrição via Edge Function (Gemini)
 */
export async function analyzeClinicalData(transcript: string, sessionContext?: string): Promise<AudioAnalysisResult> {
    let analysisPrompt = TEXT_ANALYSIS_PROMPT.replace('${rawWhisperText}', transcript);

    if (sessionContext) {
        analysisPrompt += `\n\nCONTEXTO EXTRA DA SESSÃO:\n${sessionContext}`;
    }

    try {
        const response = await callAIProxy('generate_content', {
            model: AI_MODELS.FAST_TASKS,
            contents: analysisPrompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        const result = parseLLMJSON<AudioAnalysisResult>(response.text);
        return result;
    } catch (error: unknown) {
        console.error("❌ Falha na análise do Gemini via Proxy:", error);
        throw new Error("Falha ao gerar inteligência clínica sobre a transcrição.");
    }
}

/**
 * Validate audio file format for upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
    const validExtensions = ['mp3', 'wav', 'm4a', 'webm', 'ogg'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
        return {
            valid: false,
            error: `Formato não suportado. Use: ${validExtensions.join(', ').toUpperCase()}`
        };
    }

    const maxSize = 50 * 1024 * 1024; // reduced to 50MB since we stream
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'Arquivo muito grande. Tamanho máximo: 50MB'
        };
    }

    return { valid: true };
}
