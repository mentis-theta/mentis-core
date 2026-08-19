import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';

/**
 * MENTIS - SERVICES - QUERY CLIENT
 * Centraliza a configuração do TanStack Query com persistência local.
 */

const QUERY_CACHE_KEY = 'mentis-query-cache';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,
            staleTime: 1000 * 60 * 5, // 5 minutos ( fresh data )
            gcTime: 1000 * 60 * 60 * 24, // 24 horas ( evitar acúmulo infinito de cache )
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Backoff Exponencial
        },
        mutations: {
            // Filosofia Fail-Fast para evitar perda da masterKey. Tentamos no máximo mais 1 vez de forma rápida.
            retry: 1,
            // Sem offlineFirst. Se falhar, joga o erro para a UI.
            networkMode: 'online', 
        },
    },
});

export const persister = createAsyncStoragePersister({
    storage: localforage,
    key: QUERY_CACHE_KEY,
    throttleTime: 2000, // Previne Spam de I/O, agrupando gravações (Patologia 5)
});

/**
 * Limpa o cache físico e da memória (Segurança LGPD)
 */
export const clearQueryCache = async () => {
    queryClient.clear();
    await localforage.removeItem(QUERY_CACHE_KEY);
    window.localStorage.removeItem(QUERY_CACHE_KEY); // Para o caso de existir lixo antigo
};
