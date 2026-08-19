import React, { useState } from 'react';
import { useCopilotSession } from '@/hooks/useCopilotSession';
import { CopilotContextSelector } from './CopilotContextSelector';
import { CaseFormulationBoard } from './CaseFormulationBoard';
import { BrainCircuit, ChevronDown, Play, Loader2, AlertTriangle, CheckCircle2, CopyPlus } from 'lucide-react';
import type { JSONContent } from '@/types';

interface CopilotWorkspaceProps {
  editorContent: string | JSONContent;
  onInsertContent?: (content: string) => void;
}

export const CopilotWorkspace: React.FC<CopilotWorkspaceProps> = ({ editorContent, onInsertContent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { status, errorMsg, result, query, setQuery, contextConfig, setContextConfig, analyze, cancel } = useCopilotSession(editorContent);

  const getStatusLabel = () => {
    switch (status) {
      case 'preparing_context': return 'Extraindo Fatos...';
      case 'searching': return 'Consultando Literatura e RAG...';
      case 'reasoning': return 'Calculando Confiança (Ontologia)...';
      case 'generating': return 'Montando Formulação de Caso...';
      default: return 'Processando...';
    }
  };

  return (
    <div className="mt-4 bg-surface rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm overflow-hidden flex flex-col transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors focus:outline-none"
      >
        <div className="flex items-center">
          <BrainCircuit className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Painel de Exploração Clínica</h4>
          {status === 'ready' && <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Análise Pronta</span>}
          {status === 'outdated' && <span className="ml-3 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Desatualizado</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-4 pt-0 animate-fadeIn">
          {/* Alerta Epistêmico Obrigatório */}
          <div className="mb-4 mt-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Esta exploração é uma ferramenta de apoio ao raciocínio clínico. Não estabelece diagnósticos nem substitui o julgamento profissional. Baseado apenas no contexto selecionado.
            </p>
          </div>

          <CopilotContextSelector 
            config={contextConfig} 
            setConfig={setContextConfig} 
            disabled={status !== 'idle' && status !== 'ready' && status !== 'outdated'} 
          />

          <div className="relative mb-4">
            <textarea
              className="w-full h-24 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:opacity-50"
              placeholder="Ex: Identifique fatores mantenedores para o problema de ansiedade, focando na evitação relatada."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={status !== 'idle' && status !== 'ready' && status !== 'outdated'}
            />
            
            {(status === 'idle' || status === 'ready' || status === 'outdated' || status === 'error') ? (
              <button
                onClick={analyze}
                className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                {status === 'outdated' ? 'Reanalisar' : 'Analisar'}
              </button>
            ) : (
              <button
                onClick={cancel}
                className="absolute bottom-3 right-3 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
              >
                Cancelar
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {errorMsg}
            </div>
          )}

          {/* Loading State */}
          {(status === 'preparing_context' || status === 'searching' || status === 'reasoning' || status === 'generating') && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{getStatusLabel()}</p>
              <div className="w-64 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                     style={{ width: status === 'preparing_context' ? '25%' : status === 'searching' ? '50%' : status === 'reasoning' ? '75%' : '90%' }}>
                </div>
              </div>
            </div>
          )}

          {/* Result View */}
          {status === 'ready' && result && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6 animate-fadeIn flex flex-col h-[600px]">
               <div className="flex-1 overflow-hidden min-h-0">
                 <CaseFormulationBoard result={result} />
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                 <p className="text-xs text-slate-500 italic">
                   Snaphot gerado do editor v{result.snapshot_id ? 'atual' : ''}
                 </p>
                 <button 
                   onClick={() => onInsertContent?.("[Bloco de Formulação Inserido pelo Copilot]")}
                   className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-colors border border-indigo-200 dark:border-indigo-800"
                 >
                   <CopyPlus className="w-4 h-4 mr-2" />
                   Inserir no Prontuário
                 </button>
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
