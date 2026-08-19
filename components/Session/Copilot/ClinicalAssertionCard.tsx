import React, { useState } from 'react';
import type { ClinicalAssertionNode, ExtractedFactNode, ObservationNode } from '@/types/copilot';
import { ShieldCheck, ShieldAlert, FileText, CornerDownRight, ChevronRight, User, Cpu } from 'lucide-react';

interface ClinicalAssertionCardProps {
  assertion: ClinicalAssertionNode;
  facts: Record<string, ExtractedFactNode>;
  observations: Record<string, ObservationNode>;
}

export const ClinicalAssertionCard: React.FC<ClinicalAssertionCardProps> = ({ assertion, facts, observations }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    switch (assertion.status) {
      case 'sustained': return 'text-green-600 bg-green-50 border-green-200';
      case 'contested': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'invalidated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const StatusIcon = assertion.status === 'sustained' ? ShieldCheck : ShieldAlert;

  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all shadow-sm ${getStatusColor()}`}>
      <div 
        className="p-3 flex items-start cursor-pointer hover:bg-white/50"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight className={`w-4 h-4 mt-0.5 mr-2 opacity-50 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
              Asserção Clínica ({assertion.type})
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold flex items-center opacity-70">
                {assertion.origin === 'engine' ? <Cpu className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                {assertion.origin}
              </span>
              <StatusIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-semibold">{assertion.assertion}</p>
        </div>
      </div>

      {expanded && (
        <div className="bg-white/80 dark:bg-slate-900/50 p-3 border-t border-inherit">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">Justificativa Clínica</p>
            <p className="text-sm italic opacity-90">"{assertion.justification}"</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">Fatos Base (Bottom-Up)</p>
            <div className="space-y-3">
              {assertion.extractedFactIds.map(factId => {
                const fact = facts[factId];
                if (!fact) return null;
                return (
                  <div key={factId} className="flex flex-col ml-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{fact.fact}</span>
                    
                    <div className="mt-2 space-y-2">
                      {fact.observationIds.map(obsId => {
                        const obs = observations[obsId];
                        if (!obs) return null;
                        return (
                          <div key={obs.id} className="flex items-start">
                            <CornerDownRight className="w-3 h-3 text-slate-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 p-2 rounded text-xs border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Observação ({obs.sourceContext})</span>
                              <span className="text-slate-600 dark:text-slate-300 italic">"{obs.rawText}"</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
