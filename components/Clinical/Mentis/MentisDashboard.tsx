import React, { useState } from 'react';
import { useMentisReasoning } from '../../../hooks/useMentisReasoning';
import { MissingInformationPanel } from './MissingInformationPanel';
import { EvidenceNodeCard } from './EvidenceNodeCard';
import { AuditViewer } from './AuditViewer';
import { Send, Loader2, Sparkles, BrainCircuit } from 'lucide-react';

export const MentisDashboard: React.FC = () => {
  const { analyzeCase, clearAnalysis, submitClinicalFeedback, result, isLoading } = useMentisReasoning();
  const [query, setQuery] = useState('');
  
  // Progressive Disclosure State
  const [loadingStage, setLoadingStage] = useState(0);

  React.useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    if (isLoading) {
      setLoadingStage(0);
      timeouts.push(setTimeout(() => setLoadingStage(1), 2000));
      timeouts.push(setTimeout(() => setLoadingStage(2), 5000));
      timeouts.push(setTimeout(() => setLoadingStage(3), 9000));
    } else {
      setLoadingStage(0);
    }
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isLoading]);

  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 0: return 'Iniciando pipeline de raciocínio...';
      case 1: return 'Buscando literatura cruzada...';
      case 2: return 'Analisando contradições clínicas...';
      case 3: return 'Gerando matriz de hipóteses...';
      default: return 'Processando...';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeCase(query);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BrainCircuit className="text-indigo-600" size={28} />
          Copiloto Clínico
        </h1>
        <p className="text-gray-500 mt-1">Análise de raciocínio clínico baseada em evidências.</p>
      </div>

      {/* INPUT VIGNETTE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <label htmlFor="clinical-query" className="block text-sm font-medium text-gray-700">
              Relato Clínico ou Anotações da Sessão
            </label>
          </div>
          <div className="p-4">
            <textarea
              id="clinical-query"
              rows={4}
              className="w-full resize-none border-0 focus:ring-0 text-gray-800 placeholder-gray-400 sm:text-sm"
              placeholder="Ex: Paciente relata perda de interesse, insônia terminal e tristeza constante há 3 meses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {isLoading ? 'Analisando Evidências...' : 'Analisar Caso'}
            </button>
          </div>
        </form>
      </div>

      {/* SKELETON LOADER BOXY */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-100 h-40 rounded-none animate-pulse border border-gray-200"></div>
            <div className="bg-gray-100 h-64 rounded-none animate-pulse border border-gray-200 relative overflow-hidden flex items-center justify-center">
              <span className="text-gray-400 font-mono text-xs uppercase tracking-widest animate-pulse">
                {getLoadingMessage()}
              </span>
            </div>
          </div>
          <div className="lg:col-span-8 space-y-4">
            <div className="h-6 w-1/3 bg-gray-200 rounded-none animate-pulse mb-6"></div>
            <div className="bg-gray-50 h-32 rounded-none animate-pulse border border-gray-200"></div>
            <div className="bg-gray-50 h-32 rounded-none animate-pulse border border-gray-200"></div>
            <div className="bg-gray-50 h-32 rounded-none animate-pulse border border-gray-200"></div>
          </div>
        </div>
      )}

      {/* RESULTADOS DA ANÁLISE */}
      {result && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* COLUNA ESQUERDA: Checklist e Narrativa */}
          <div className="lg:col-span-4 space-y-6">
            <MissingInformationPanel 
              missingItems={result.state.informacoes_ausentes_checklist} 
            />

            <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles size={64} />
              </div>
              <h3 className="font-semibold text-indigo-900 text-sm mb-3">Síntese Narrativa</h3>
              <div className="prose prose-sm prose-indigo">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.narrative}
                </p>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Grafo de Evidências */}
          <div className="lg:col-span-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              Grafo de Hipóteses
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {result.state.grafo_evidencias?.length || 0}
              </span>
            </h2>
            
            <div className="space-y-4">
              {result.state.grafo_evidencias?.map((node, index) => (
                <EvidenceNodeCard 
                  key={index} 
                  node={node} 
                  onFeedback={(avaliacao, motivo) => submitClinicalFeedback(query, node.hipotese_clinica, avaliacao, motivo)}
                />
              ))}
            </div>

            {/* BOTÃO DE AUDITORIA */}
            <AuditViewer data={result} />
          </div>
        </div>
      )}
    </div>
  );
};
