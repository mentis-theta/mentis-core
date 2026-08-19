/**
 * Utilitário Isomórfico de Variáveis de Ambiente
 * Permite a leitura segura em ambientes Vite (Browser), Node e Deno (Edge Functions).
 */
declare var Deno: any;
export const getEnv = (key: string, defaultValue?: string): string => {
    let value: string | undefined;

    try {
        // 1. Vite (Browser)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            value = (import.meta as any).env[key];
        } 
        // 2. Deno (Edge Functions)
        else if (typeof Deno !== 'undefined') {
            value = Deno.env.get(key);
        } 
        // 3. Node.js
        else if (typeof process !== 'undefined' && process.env) {
            value = process.env[key];
        }
    } catch (e) {
        console.warn(`[getEnv] Erro ao acessar variável de ambiente ${key}:`, e);
    }

    return value ?? defaultValue ?? '';
};
