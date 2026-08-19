import React from 'react';
import { AlertOctagon, RotateCcw, Headset, ShieldAlert } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface ErrorFallbackProps {
  error: Error;
  componentStack: string | null;
  eventId: string | null;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, componentStack, eventId, resetError }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center p-6 selection:bg-rose-500/30 font-sans transition-colors duration-300">
      <div className="max-w-2xl w-full bg-white dark:bg-[#121214] border border-red-200 dark:border-red-900/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl ring-1 ring-red-200 dark:ring-red-900/50">
            <ShieldAlert className="w-12 h-12 text-red-500" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Falha de Contenção Crítica
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              O Mentis interceptou uma exceção no motor de renderização. 
              Por segurança clínica, a interface foi suspensa para evitar o vazamento ou corrupção de dados da sessão atual.
            </p>
          </div>

          <div className="w-full bg-slate-50 dark:bg-[#0A0A0B] border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 mt-4 text-left">
            <div className="flex items-center gap-2 mb-2 text-red-500 dark:text-red-400">
              <AlertOctagon className="w-4 h-4" />
              <span className="text-xs font-mono font-medium uppercase tracking-wider">Diagnóstico Técnico</span>
            </div>
            <p className="text-sm font-mono text-slate-800 dark:text-slate-300 break-words">
              {error.message || "Erro desconhecido"}
            </p>
            {eventId && (
              <p className="text-xs font-mono text-slate-500 mt-2">
                ID do Incidente (Sentry): <span className="text-slate-500 dark:text-slate-400">{eventId}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
            <button
              onClick={() => {
                resetError();
                window.location.reload();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-slate-200 dark:shadow-white/5 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar Sessão
            </button>
            <button
              onClick={() => {
                const report = `🚨 RELATÓRIO DE FALHA CRÍTICA - MENTIS 🚨\n\n` +
                               `Data: ${new Date().toISOString()}\n` +
                               `Erro: ${error.message}\n` +
                               `Sentry ID: ${eventId || 'N/A'}\n\n` +
                               `Stack Trace:\n${componentStack || 'Não disponível'}`;
                navigator.clipboard.writeText(report);
                alert('Relatório copiado para a área de transferência! Cole-o na sua mensagem para o suporte.');
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 dark:bg-[#1A1A1E] dark:hover:bg-[#25252A] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
            >
              <Headset className="w-4 h-4" />
              Copiar Relatório
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-xs text-slate-500 dark:text-slate-600 font-medium flex items-center gap-2">
        <span>MENTIS ARCHITECTURE</span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span>E2EE SECURE</span>
      </div>
    </div>
  );
};
