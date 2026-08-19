import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Activity, Database, ServerCrash, Clock, Search, ChevronRight, X } from 'lucide-react';
import { JsonViewer } from './JsonViewer';
import Button from '@/components/Button';

interface AiApiLog {
  id: string;
  created_at: string;
  action_name: string;
  model_used: string;
  status_code: number;
  error_reason: string | null;
  latency_ms: number;
  request_payload: any;
  response_payload: any;
  user_id: string | null;
}

export const AdminAiInspectorTab = () => {
  const [logs, setLogs] = useState<AiApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AiApiLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data as AiApiLog[]);
    } catch (err) {
      console.error('Falha ao buscar logs de IA', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Inscrição em tempo real para novos logs
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_api_logs',
        },
        (payload) => {
          setLogs((prev) => [payload.new as AiApiLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalLogs = logs.length;
  const errorLogs = logs.filter(l => l.status_code >= 400).length;
  const rateLimitLogs = logs.filter(l => l.status_code === 429).length;
  const avgLatency = totalLogs > 0 
    ? Math.round(logs.reduce((acc, l) => acc + l.latency_ms, 0) / totalLogs) 
    : 0;

  const getStatusBadge = (code: number) => {
    if (code === 200) return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">200 OK</span>;
    if (code === 429) return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold">429 RATE LIMIT</span>;
    if (code === 503) return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded text-xs font-bold">503 HIGH DEMAND</span>;
    return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded text-xs font-bold">{code} ERROR</span>;
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-2">
            <Database className="w-7 h-7 text-indigo-500" />
            AI Inspector & Audit
          </h2>
          <p className="text-sm text-foreground-muted mt-1">
            Auditoria em tempo real de requisições, rate limits e fallback models da API Gemini.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchLogs} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Requisições (Hoje)</p>
          </div>
          <p className="text-3xl font-black text-on-surface">{totalLogs}</p>
        </div>

        <div className="bg-surface border border-border/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Taxa de Erro</p>
          </div>
          <p className="text-3xl font-black text-on-surface">
            {totalLogs > 0 ? Math.round((errorLogs / totalLogs) * 100) : 0}%
          </p>
        </div>

        <div className="bg-surface border border-border/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl text-amber-600 dark:text-amber-400">
              <ServerCrash className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Rate Limits (429)</p>
          </div>
          <p className="text-3xl font-black text-on-surface">{rateLimitLogs}</p>
        </div>

        <div className="bg-surface border border-border/60 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Latência Média</p>
          </div>
          <p className="text-3xl font-black text-on-surface">{avgLatency} ms</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-border/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-surface-container-low">
          <h3 className="font-bold text-on-surface">Histórico de Chamadas</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input 
              type="text" 
              placeholder="Filtrar logs..." 
              className="pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm w-64 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-high text-foreground-muted text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Latência</th>
                <th className="px-6 py-4 text-right">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-foreground-muted">
                    Nenhum log de IA registrado ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {log.action_name}
                    </td>
                    <td className="px-6 py-4 text-foreground-muted">
                      {log.model_used}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status_code)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.latency_ms} ms
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal/Drawer de Inspeção Profunda */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface h-full w-full max-w-3xl shadow-2xl flex flex-col animate-slideInRight border-l border-border/60">
            {/* Header Drawer */}
            <div className="flex items-center justify-between p-6 border-b border-border/60 bg-surface-container-low">
              <div>
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-3">
                  Detalhes da Requisição
                  {getStatusBadge(selectedLog.status_code)}
                </h3>
                <p className="text-sm text-foreground-muted mt-1">ID: {selectedLog.id}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 bg-surface-container hover:bg-surface-container-high rounded-full text-foreground-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Metadados */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container p-4 rounded-xl border border-border/60">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted">Modelo</p>
                  <p className="font-medium text-on-surface mt-1">{selectedLog.model_used}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl border border-border/60">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted">Latência</p>
                  <p className="font-medium text-on-surface mt-1">{selectedLog.latency_ms} ms</p>
                </div>
                <div className="bg-surface-container p-4 rounded-xl border border-border/60 col-span-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted">Motivo / Erro</p>
                  <p className={`font-medium mt-1 truncate ${selectedLog.error_reason ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {selectedLog.error_reason || 'OK (Nenhum Erro)'}
                  </p>
                </div>
              </div>

              {/* Request Payload */}
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-border/60 pb-2">
                  Request Payload (Prompt)
                </h4>
                <JsonViewer data={selectedLog.request_payload} />
              </div>

              {/* Response Payload */}
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-border/60 pb-2">
                  Response Payload
                </h4>
                <JsonViewer data={selectedLog.response_payload} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
