import React, { useState } from 'react';
import { Compass, Plus, Clock, ChevronDown } from 'lucide-react';
import { useCognitiveTask } from '../../../hooks/useCognitiveTask';
import Button from '@/components/Button';
import { formatDate } from '@/utils/formatters';

const RIASECTask = React.lazy(() => import('./RIASEC/RIASECTask'));
const RIASECResultCard = React.lazy(() => import('./RIASEC/RIASECResultCard'));

interface VocationalPanelProps {
  patientId: string;
}

const VocationalPanel: React.FC<VocationalPanelProps> = ({ patientId }) => {
  const { records, loading } = useCognitiveTask(patientId, 'riasec');
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  if (isTaskActive) {
    return (
      <React.Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando ambiente de avaliação...</div>}>
        <RIASECTask
          patientId={patientId}
          onComplete={() => setIsTaskActive(false)}
          onCancel={() => setIsTaskActive(false)}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Ação */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface border border-border/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20">
            <Compass className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-on-surface mb-1">RIASEC — Tipologia de Holland</h4>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Avalia o perfil de interesses profissionais usando o O*NET Interest Profiler (48 itens). 
              Gera código Holland e gráfico hexagonal.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsTaskActive(true)} variant="primary" className="shrink-0 !bg-amber-600 hover:!bg-amber-700 !text-white !rounded-xl shadow-sm">
          <Plus size={16} className="mr-2" /> Iniciar Avaliação
        </Button>
      </div>

      {/* Histórico de Avaliações */}
      {records.length > 0 && (
        <div className="bg-surface border border-border/60 rounded-3xl p-6 shadow-sm">
          <h4 className="font-bold text-foreground-muted mb-4 flex items-center gap-2">
            <Clock size={16} /> Histórico de Avaliações ({records.length})
          </h4>
          <div className="space-y-3">
            {[...records].reverse().map(record => {
              const summary = record.metadata.summary as any;
              const isExpanded = expandedRecordId === record.id;
              
              return (
                <div key={record.id} className="rounded-2xl border border-border overflow-hidden bg-background">
                  <button
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-on-surface w-24">
                        {formatDate(record.date).substring(0, 5)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground-muted">Código Holland:</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                          {summary?.hollandCode || 'N/D'}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-foreground-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && summary && (
                    <div className="p-4 border-t border-border bg-surface-container-low animate-fadeIn">
                      <React.Suspense fallback={<div className="p-4 text-center text-xs">Carregando resultados...</div>}>
                        <RIASECResultCard score={summary} />
                      </React.Suspense>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-3xl text-foreground-muted">
          <Compass className="w-12 h-12 opacity-20 mb-3" />
          <p>Nenhuma avaliação vocacional registrada.</p>
        </div>
      )}
    </div>
  );
};

export default VocationalPanel;

