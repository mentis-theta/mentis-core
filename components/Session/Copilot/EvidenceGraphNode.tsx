import React, { useState } from 'react';
import type { ExtractedFactNode, ObservationNode, LiteratureNode } from '@/types/copilot';
import { FileText, BookOpen, ChevronRight, CornerDownRight } from 'lucide-react';

interface EvidenceGraphNodeProps {
  fact: ExtractedFactNode;
  observations: Record<string, ObservationNode>;
  literature?: LiteratureNode[];
}

export const EvidenceGraphNode: React.FC<EvidenceGraphNodeProps> = ({ fact, observations, literature = [] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden mb-2 transition-all shadow-sm hover:shadow-md">
      <div 
        className="p-3 flex items-start cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight className={`w-4 h-4 text-slate-400 mt-0.5 mr-2 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{fact.fact}</p>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <span className="font-semibold">{fact.observationIds.length}</span> observação(ões) base
            {literature.length > 0 && (
              <span className="ml-3 font-semibold text-indigo-600 flex items-center">
                <BookOpen className="w-3 h-3 mr-1" /> {literature.length} literatura(s) de suporte
              </span>
            )}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-3">
            {fact.observationIds.map(obsId => {
              const obs = observations[obsId];
              if (!obs) return null;
              return (
                <div key={obs.id} className="flex items-start">
                  <CornerDownRight className="w-3 h-3 text-slate-400 mr-2 mt-1 flex-shrink-0" />
                  <div className="flex-1 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center mb-1">
                      <FileText className="w-3 h-3 text-slate-400 mr-1" />
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fato Relatado ({obs.sourceContext})</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{obs.rawText}"</p>
                  </div>
                </div>
              );
            })}
            
            {literature.map(lit => (
              <div key={lit.id} className="flex items-start mt-3">
                 <CornerDownRight className="w-3 h-3 text-indigo-400 mr-2 mt-1 flex-shrink-0" />
                 <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <BookOpen className="w-3 h-3 text-indigo-500 mr-1" />
                        <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 tracking-wider">Sustentação Literária</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200">
                        Força: {lit.authority.methodologicalStrength.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">{lit.title}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 italic">"{lit.snippet}"</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
