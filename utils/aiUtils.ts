/**
 * Utility function to clean markdown formatting (like ```html or ```json) 
 * from LLM raw text responses.
 */
export function cleanLLMText(rawText: string): string {
    if (!rawText) return '';

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    return cleaned;
}

/**
 * Utility function to clean and parse JSON responses from LLMs.
 * Removes markdown formatting (e.g., ```json), extracts JSON, and handles
 * unescaped control characters dynamically.
 */
export function parseLLMJSON<T>(rawText: string): T {
    if (!rawText) {
        return {} as T;
    }

    let cleaned = cleanLLMText(rawText);

    // Try to extract JSON if it's embedded in text
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

    let startIndex = -1;
    let endIndex = -1;

    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        endIndex = lastBrace;
    } else if (firstBracket !== -1 && lastBracket !== -1) {
        startIndex = firstBracket;
        endIndex = lastBracket;
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    // Sanitize JSON string by escaping control characters inside strings
    let inString = false;
    let escaped = false;
    let sanitized = '';

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (char === '"' && !escaped) {
            inString = !inString;
        }

        if (char === '\\' && !escaped) {
            escaped = true;
            sanitized += char;
            continue;
        } else {
            escaped = false;
        }

        if (inString && char.charCodeAt(0) < 32) {
            if (char === '\n') sanitized += '\\n';
            else if (char === '\r') sanitized += '\\r';
            else if (char === '\t') sanitized += '\\t';
            else sanitized += ' ';
        } else {
            sanitized += char;
        }
    }

    try {
        return JSON.parse(sanitized) as T;
    } catch (parseError: unknown) {
        try {
            return JSON.parse(sanitized + '"}') as T;
        } catch (e1) {
            try {
                return JSON.parse(sanitized + '"} }') as T;
            } catch (e2) {
                try {
                    return JSON.parse(sanitized + '"} ]') as T;
                } catch (e3) {
                    try {
                        return JSON.parse(sanitized + '"} } ]') as T;
                    } catch (e4) {
                        // Se tudo falhar, loga o erro original
                    }
                }
            }
        }

        if (parseError instanceof Error) {
            console.error(' JSON.parse failed:', parseError.message);
            // Log the failing snippet for debugging
            const match = parseError.message.match(/at position (\d+)/);
            if (match) {
                const pos = parseInt(match[1]);
                const start = Math.max(0, pos - 50);
                const end = Math.min(sanitized.length, pos + 50);
                console.error(` Failing Snippet:\n...${sanitized.slice(start, end)}...`);
            }
        }
        throw new Error('Falha ao processar a resposta da IA como dados estruturados.');
    }
}

import { CallMetadata } from '../types';
import { eventBus } from '../services/ops/eventBus';
import { getEnv } from './env';

export async function callGeminiAPI(prompt: string, isStructured: boolean = false): Promise<{ text: string, metadata: CallMetadata }> {
    const ai = await import('@google/genai').then(m => m.GoogleGenAI);
    const apiKey = getEnv('VITE_GEMINI_API_KEY');

    if (!apiKey) {
        throw new Error('API_KEY não configurada. Configure a chave do Gemini nas variáveis de ambiente.');
    }

    const client = new ai({ apiKey });

    const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite'
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            const configObj: any = {
                temperature: 0.7,
                maxOutputTokens: 8192,
            };
            if (isStructured) {
                configObj.responseMimeType = 'application/json';
            }

            const start = Date.now();
            
            // Mitigation 3: Edge Function Timeout (45s max to allow graceful failure)
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED: LLM demorou mais que 45 segundos.')), 45000)
            );
            
            const response = await Promise.race([
                client.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: configObj
                }),
                timeoutPromise
            ]);
            
            const latencyMs = Date.now() - start;

            const generatedText = response.text || '';
            const usage = response.usageMetadata || {};

            const metadata = {
                promptTokenCount: usage.promptTokenCount || 0,
                candidatesTokenCount: usage.candidatesTokenCount || 0,
                totalTokenCount: usage.totalTokenCount || 0,
                latencyMs,
                modelVersion: modelName
            };

            // Dispara evento de telemetria silencioso
            eventBus.publish({
                type: 'telemetry',
                model_version: metadata.modelVersion,
                prompt_tokens: metadata.promptTokenCount,
                completion_tokens: metadata.candidatesTokenCount,
                latency_ms: metadata.latencyMs,
                status: 'success'
            });

            return {
                text: cleanLLMText(generatedText),
                metadata
            };
        } catch (error: any) {
            console.error(`Falha ao tentar o modelo ${modelName}:`, error?.message || error);
            lastError = error;
            
            // Dispara evento de erro silencioso
            eventBus.publish({
                type: 'telemetry',
                model_version: modelName,
                prompt_tokens: 0,
                completion_tokens: 0,
                latency_ms: 0, // Poderíamos capturar a latência de falha se mudássemos o código
                status: 'error'
            });
            
            // Se o erro for de cota ou bloqueio de pagamento, não adianta tentar outros modelos
            const errorMessage = error?.message || error?.toString() || '';
            if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('billing')) {
                throw new Error('O limite de uso ou bloqueio de faturamento da API foi atingido. Verifique sua conta no Google AI Studio.');
            }
            // Se for 404, continua o loop para o próximo modelo
        }
    }

    throw new Error(`Nenhum modelo compatível encontrado na sua chave de API. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}
