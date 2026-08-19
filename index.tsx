import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from './services/queryClient.ts';
import App from './App.tsx';
import './index.css'; // Global Styles
import * as Sentry from "@sentry/react";
import { initTelemetry } from './services/telemetryService.ts';
import localforage from 'localforage';
import { ErrorFallback } from './components/Layout/ErrorFallback.tsx';

// Inicializa a telemetria do PostHog de forma blindada (LGPD)
initTelemetry();

// Força o sistema a buscar dados novos do Supabase sempre que a página sofre reload (F5)
// Isso mantém a interface rápida (usando o cache local) mas garante atualização em background.
queryClient.invalidateQueries();

// Auto-reload upon Vite dynamic import failures (e.g. after a new deploy)
// We use a sessionStorage flag to prevent infinite reload loops if the network is truly offline.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, reloading page...', event);
  const isReloaded = sessionStorage.getItem('mentis_reloaded_from_error');
  if (!isReloaded) {
    sessionStorage.setItem('mentis_reloaded_from_error', 'true');
    window.location.reload();
  }
});

// If the app successfully loads, we clear the flag
sessionStorage.removeItem('mentis_reloaded_from_error');

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      try {
        const sanitizeString = (str: string) => {
          if (typeof str !== 'string') return str;
          let sanitized = str;
          // 1. Mascarar CPFs (123.456.789-00 ou 12345678900)
          sanitized = sanitized.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED_CPF]');
          // 2. Mascarar E-mails
          sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
          // 3. Mascarar Transcrições (Strings > 200 caracteres com muitos espaços, típico de texto livre)
          if (sanitized.length > 200 && sanitized.split(' ').length > 10) {
            return sanitized.substring(0, 50) + '... [REDACTED_LONG_TEXT]';
          }
          return sanitized;
        };

        const sanitizeObject = (obj: any): any => {
          if (!obj) return obj;
          if (typeof obj === 'string') return sanitizeString(obj);
          if (Array.isArray(obj)) return obj.map(sanitizeObject);
          if (typeof obj === 'object') {
            const newObj: any = {};
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = sanitizeObject(obj[key]);
              }
            }
            return newObj;
          }
          return obj;
        };

        return sanitizeObject(event);
      } catch (e) {
        console.error("Sentry sanitization failed", e);
        return event;
      }
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

/**
 * KAMIKAZE MIGRATION (Profilaxia 1)
 * Migra dados gigantes do localStorage síncrono para o IndexedDB assíncrono ANTES do React renderizar.
 * Isso garante que o Strict Mode não cause Race Conditions com useEffects.
 */
async function runKamikazeMigration() {
    const PATIENT_KEY = 'psychologist-patient-records';
    const QUERY_CACHE_KEY = 'mentis-query-cache';

    try {
        const legacyPatients = window.localStorage.getItem(PATIENT_KEY);
        if (legacyPatients) {
            console.log('Migrando pacientes do localStorage para IndexedDB...');
            await localforage.setItem(PATIENT_KEY, legacyPatients);
            window.localStorage.removeItem(PATIENT_KEY);
        }

        const legacyQueryCache = window.localStorage.getItem(QUERY_CACHE_KEY);
        if (legacyQueryCache) {
            console.log('Migrando cache do React Query do localStorage para IndexedDB...');
            await localforage.setItem(QUERY_CACHE_KEY, legacyQueryCache);
            window.localStorage.removeItem(QUERY_CACHE_KEY);
        }
    } catch (e) {
        console.error('Falha crítica na migração Kamikaze:', e);
    }
}

// Renderiza a aplicação APENAS após a garantia da migração (Singleton Atômico)
runKamikazeMigration().then(() => {
    root.render(
      <React.StrictMode>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          <BrowserRouter>
            <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} error={props.error as Error} />}>
              <App />
            </Sentry.ErrorBoundary>
          </BrowserRouter>
        </PersistQueryClientProvider>
      </React.StrictMode>
    );
});