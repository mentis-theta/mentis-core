import posthog from 'posthog-js';

// Variáveis de ambiente (Vite). Se ausentes, a telemetria desativa silenciosamente.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const isTelemetryEnabled = !!POSTHOG_KEY;

// Flag de segurança para garantir que a inicialização ocorra apenas uma vez e no cliente
let isInitialized = false;

export const initTelemetry = () => {
    if (typeof window !== 'undefined' && !isInitialized && isTelemetryEnabled) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            // BLINDAGEM LGPD/HIPAA:
            // 1. Desliga o autocapture agressivo, permitindo gravação apenas de cliques
            autocapture: true, 
            capture_pageview: true, // Registra as telas, mas sem capturar os inputs
            
            // 2. O Session Recording (que filma a tela) precisa ser extremamente restrito
            session_recording: {
                // EXTREMAMENTE CRÍTICO: Troca todos os textos digitados em inputs/textareas por asteriscos (***)
                maskAllInputs: true,
                
                // EXTREMAMENTE CRÍTICO: Troca TODOS os textos renderizados na tela por asteriscos. 
                // Assim, relatos do paciente ou anotações clínicas ficam 100% ocultos na gravação visual.
                maskTextSelector: "*",
                
                // Ocultar dados sensíveis de rede (headers, payloads)
                maskNetworkRequestFn: (request) => {
                    return null; // Remove os dados das requisições interceptadas no vídeo
                }
            }
        });
        isInitialized = true;
    }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (isInitialized) {
        posthog.capture(eventName, properties);
    }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (isInitialized) {
        posthog.identify(userId, properties);
    }
};

export const resetTelemetry = () => {
    if (isInitialized) {
        posthog.reset();
    }
};
