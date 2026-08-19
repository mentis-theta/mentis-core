import { DomainEvent } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { getEnv } from '../../utils/env';
import { showGlobalToast } from '../../contexts/ToastContext.tsx';

export interface TelemetryEvent {
    type: 'telemetry';
    session_id?: string;
    model_version: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
    status: 'success' | 'error' | 'timeout';
}

export interface ExtractorTelemetryEvent {
    type: 'TELEMETRY';
    level: 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, any>;
}

export interface UnknownConceptEvent {
    type: 'unknown_concept';
    term: string;
    context: string;
}

export type AppEvent = DomainEvent | TelemetryEvent | UnknownConceptEvent | ExtractorTelemetryEvent;
type EventCallback = (event: AppEvent) => void;

export function dispatch_clinical_events(event: ExtractorTelemetryEvent) {
    EventBus.getInstance().publish(event);
}

class EventBus {
    private subscribers: Map<string, EventCallback[]> = new Map();
    private static instance: EventBus;
    
    // Background Sync Buffer
    private eventBuffer: AppEvent[] = [];
    private dispatchTimeout: NodeJS.Timeout | null = null;
    private readonly BATCH_DELAY_MS = 2000;

    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flushSynchronously();
            });
        }
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public subscribe(eventType: string, callback: EventCallback): () => void {
        const callbacks = this.subscribers.get(eventType) || [];
        callbacks.push(callback);
        this.subscribers.set(eventType, callbacks);

        // Return unsubscribe function
        return () => {
            const currentCallbacks = this.subscribers.get(eventType) || [];
            this.subscribers.set(
                eventType,
                currentCallbacks.filter(cb => cb !== callback)
            );
        };
    }

    public publish(event: AppEvent): void {
        console.log(`[EventBus] Publishing ${event.type}`);
        
        // Notify specific listeners
        const callbacks = this.subscribers.get(event.type) || [];
        callbacks.forEach(cb => {
            try {
                cb(event);
            } catch (err) {
                console.error(`[EventBus] Error in subscriber for ${event.type}:`, err);
            }
        });

        // Notify catch-all listeners if needed (e.g. wildcard '*')
        const wildcardCallbacks = this.subscribers.get('*') || [];
        wildcardCallbacks.forEach(cb => {
            try {
                cb(event);
            } catch (err) {
                console.error(`[EventBus] Error in wildcard subscriber:`, err);
            }
        });

        // Push to buffer for Backend Sync
        this.eventBuffer.push(event);
        this.scheduleSync();
    }

    public publishBatch(events: AppEvent[]): void {
        events.forEach(e => this.publish(e));
    }

    private scheduleSync() {
        if (this.dispatchTimeout) return;

        this.dispatchTimeout = setTimeout(() => {
            this.syncWithBackend();
        }, this.BATCH_DELAY_MS);
    }

    private async syncWithBackend() {
        if (this.eventBuffer.length === 0) {
            this.dispatchTimeout = null;
            return;
        }

        const payload = [...this.eventBuffer];
        this.eventBuffer = [];
        this.dispatchTimeout = null;

        try {
            // RPC Atômica garantindo que todos os eventos sejam descarregados no Supabase
            const { error } = await supabase.rpc('dispatch_clinical_events', { payload });
            
            if (error) {
                console.error('[EventBus] RPC Sync Error:', error);
                showGlobalToast('Erro ao sincronizar dados no servidor. Verifique sua conexão.', 'error');
            } else {
                console.debug(`[EventBus] ${payload.length} events synced to Postgres.`);
            }
        } catch (err) {
            console.error('[EventBus] Network Error:', err);
            showGlobalToast('Falha de rede ao sincronizar. Seus dados estão salvos localmente.', 'warning');
        }
    }

    /**
     * Flush Síncrono acionado pelo ciclo de vida do navegador (beforeunload).
     * Usa fetch com keepalive: true para que o browser termine a request de rede
     * mesmo que a aba/memória RAM da aplicação já tenha sido destruída.
     */
    private flushSynchronously() {
        if (this.eventBuffer.length === 0) return;

        const payload = [...this.eventBuffer];
        this.eventBuffer = [];

        let token = '';
        try {
            if (typeof localStorage !== 'undefined') {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
                        token = sessionData?.access_token || '';
                        break;
                    }
                }
            }
        } catch (e) {}

        const url = `${getEnv('VITE_SUPABASE_URL')}/rest/v1/rpc/dispatch_clinical_events`;
        const apikey = getEnv('VITE_SUPABASE_ANON_KEY');

        if (!url || !apikey) return;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': apikey,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ payload }),
                keepalive: true // A trava de segurança contra fechamento de aba
            });
        } catch (err) {
            console.error('[EventBus] Sync Flush Error:', err);
        }
    }
}

export const eventBus = EventBus.getInstance();
