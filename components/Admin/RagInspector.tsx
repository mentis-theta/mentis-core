import React, { useState, useEffect } from 'react';
import { Search, Clock, Database, Zap, AlertCircle, BookOpen, Activity } from 'lucide-react';
import { searchClinicalKnowledge, type ClinicalKnowledgeResult } from '../../services/ragService.ts';
import { supabase } from '../../services/supabaseClient.ts';

const TelemetryViewer = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTelemetry = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from('clinical_rag_feedback')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && records) {
      setData(records);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-on-surface">Telemetria de Especialistas (Feedback Loop)</h3>
        <button onClick={fetchTelemetry} className="text-sm text-primary flex items-center gap-1 hover:underline">
          <Zap className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-surface-container-low rounded-xl"></div>
          <div className="h-16 bg-surface-container-low rounded-xl"></div>
        </div>
      ) : data.length === 0 ? (
        <p className="text-foreground-muted text-center py-10">Nenhum feedback registrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${item.avaliacao === 'discordo' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {item.avaliacao}
                  </span>
                  {item.motivo_discordancia && (
                    <span className="ml-2 text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700 uppercase tracking-wider">
                      {item.motivo_discordancia}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground-muted">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground-muted">Hipótese Avaliada:</p>
                <p className="text-sm font-medium">{item.hipotese}</p>
              </div>
              <div className="bg-canvas p-2 rounded-lg mt-1 border border-border/50">
                <p className="text-xs font-semibold text-foreground-muted mb-1">Contexto Clínico (Query):</p>
                <p className="text-sm text-on-surface whitespace-pre-wrap">{item.query_text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RagInspector: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClinicalKnowledgeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'vector' | 'telemetry'>('vector');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    const startTime = performance.now();

    try {
      const data = await searchClinicalKnowledge(query, 10);
      setResults(data);
      setLatencyMs(Math.round(performance.now() - startTime));
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar documentos clínicos.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 0.8) return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', label: 'Alta' };
    if (similarity >= 0.6) return { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', label: 'Média' };
    return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'Baixa' };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('vector')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'vector' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-on-surface'}`}
        >
          Depuração Vetorial (RAG)
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'telemetry' ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-on-surface'}`}
        >
          <Activity className="w-4 h-4" /> Telemetria Clínica
        </button>
      </div>

      {activeTab === 'telemetry' ? (
        <TelemetryViewer />
      ) : (
        <>
          {/* Header */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">RAG Inspector — Base Clínica Vetorial</h2>
            <p className="text-sm text-foreground-muted">
              Busca semântica na base de conhecimento DSM-5-TR / CID-11 via pgvector
            </p>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-foreground-muted" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl leading-5 bg-canvas text-on-surface placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm transition-all"
              placeholder="Ex: Sintomas de hiperatividade em adultos, critérios de depressão maior..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Buscar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">Erro na busca vetorial</p>
            <p className="text-sm text-foreground-muted mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Métricas de Busca */}
      {latencyMs !== null && results.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-foreground-muted">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {latencyMs}ms
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </span>
          {results[0]?.similarity === 0 && (
            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium">
              ⚠ Fallback local (pgvector indisponível)
            </span>
          )}
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => {
            const badge = getSimilarityBadge(result.similarity);
            return (
              <div
                key={result.id || index}
                className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      {result.source}
                    </span>
                    {result.code && (
                      <span className="px-2 py-1 bg-surface border border-border rounded-lg text-xs font-mono text-foreground-muted">
                        {result.code}
                      </span>
                    )}
                    {result.category && (
                      <span className="px-2 py-1 bg-surface border border-border rounded-lg text-xs text-foreground-muted capitalize">
                        {result.category}
                      </span>
                    )}
                  </div>

                  {/* Badge de Similaridade */}
                  {result.similarity > 0 && (
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} whitespace-nowrap`}>
                      {(result.similarity * 100).toFixed(1)}% {badge.label}
                    </div>
                  )}
                </div>

                {/* Nome do Transtorno */}
                {result.disorder_name && (
                  <h3 className="text-sm font-semibold text-on-surface mb-2">
                    {result.disorder_name}
                  </h3>
                )}

                {/* A Agulha (O que deu o match) */}
                {result.chunk_content && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-primary mb-1">Trecho Encontrado (Agulha):</p>
                    <p className="text-sm text-foreground-muted italic leading-relaxed">
                      "{result.chunk_content}"
                    </p>
                  </div>
                )}

                {/* O Palheiro (Contexto Completo) */}
                <div>
                  <p className="text-xs font-semibold text-foreground-muted mb-2">Documento Clínico Completo (Palheiro entregue ao Gemini):</p>
                  <div className="max-h-60 overflow-y-auto bg-canvas border border-border rounded-lg p-3">
                    <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                      {result.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estado Vazio */}
      {hasSearched && !isLoading && results.length === 0 && !error && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-foreground-muted/30 mx-auto mb-4" />
          <p className="text-foreground-muted text-sm">
            Nenhum documento encontrado para essa consulta.
          </p>
          <p className="text-foreground-muted/70 text-xs mt-1">
            Verifique se a base de conhecimento foi populada com os dados de seeding.
          </p>
        </div>
      )}

      {/* Estado Inicial */}
      {!hasSearched && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-foreground-muted/30 mx-auto mb-4" />
          <p className="text-foreground-muted text-sm">
            Digite um sintoma, transtorno ou critério diagnóstico para testar a busca semântica.
          </p>
          <p className="text-foreground-muted/70 text-xs mt-2">
            O sistema converte sua query em um vetor de 768 dimensões e busca por similaridade de cosseno no pgvector.
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
};
