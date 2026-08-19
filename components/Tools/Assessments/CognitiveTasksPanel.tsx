import React, { useState } from 'react';
import { BrainCircuit, Zap, Boxes, Plus, Clock, ChevronDown } from 'lucide-react';
import { useCognitiveTask } from '../../../hooks/useCognitiveTask';
import Button from '@/components/Button';
import { formatDate } from '@/utils/formatters';

const StroopTask = React.lazy(() => import('./Stroop/StroopTask'));
const StroopResultCard = React.lazy(() => import('./Stroop/StroopResultCard'));
const CorsiTask = React.lazy(() => import('./Corsi/CorsiTask'));
const CorsiResultCard = React.lazy(() => import('./Corsi/CorsiResultCard'));

interface CognitiveTasksPanelProps {
  patientId: string;
}

const CognitiveTasksPanel: React.FC<CognitiveTasksPanelProps> = ({ patientId }) => {
  const { records: stroopRecords, loading: stroopLoading } = useCognitiveTask(patientId, 'stroop');
  const { records: corsiRecords, loading: corsiLoading } = useCognitiveTask(patientId, 'corsi');
  
  const [isStroopActive, setIsStroopActive] = useState(false);
  const [expandedStroopId, setExpandedStroopId] = useState<string | null>(null);

  const [isCorsiActive, setIsCorsiActive] = useState(false);
  const [expandedCorsiId, setExpandedCorsiId] = useState<string | null>(null);

  if (isStroopActive) {
    return (
      <React.Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando ambiente neuropsicológico...</div>}>
        <StroopTask
          patientId={patientId}
          onComplete={() => setIsStroopActive(false)}
          onCancel={() => setIsStroopActive(false)}
        />
      </React.Suspense>
    );
  }

  if (isCorsiActive) {
    return (
      <React.Suspense fallback={<div className="p-8 text-center text-foreground-muted">Carregando ambiente neuropsicológico...</div>}>
        <CorsiTask
          patientId={patientId}
          onComplete={() => setIsCorsiActive(false)}
          onCancel={() => setIsCorsiActive(false)}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Card: Stroop (Funcional) */}
      <div className="bg-surface border border-border/60 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20">
              <Zap className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-on-surface mb-1">Teste de Stroop</h4>
              <p className="text-sm text-foreground-muted leading-relaxed">
                Avalia atenção seletiva e controle inibitório. 
                100 trials com cronometragem de alta precisão (milissegundos).
              </p>
            </div>
          </div>
          <Button onClick={() => setIsStroopActive(true)} variant="primary" className="shrink-0 !bg-rose-600 hover:!bg-rose-700 !text-white !rounded-xl shadow-sm">
            <Plus size={16} className="mr-2" /> Iniciar Teste
          </Button>
        </div>

        {/* Histórico do Stroop */}
        {stroopRecords.length > 0 && (
          <div className="border-t border-border/60 pt-4 mt-2">
            <h5 className="font-bold text-sm text-foreground-muted mb-3 flex items-center gap-2">
              <Clock size={14} /> Histórico ({stroopRecords.length})
            </h5>
            <div className="space-y-2">
              {[...stroopRecords].reverse().map(record => {
                const summary = record.metadata.summary as any;
                const isExpanded = expandedStroopId === record.id;
                
                return (
                  <div key={record.id} className="rounded-xl border border-border overflow-hidden bg-background">
                    <button
                      onClick={() => setExpandedStroopId(isExpanded ? null : record.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-surface-container-high transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-on-surface w-24">
                          {formatDate(record.date).substring(0, 5)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground-muted">Interferência:</span>
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                            {summary?.interferenceEffectMs} ms
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && summary && (
                      <div className="p-4 border-t border-border bg-surface-container-low animate-fadeIn">
                        <React.Suspense fallback={<div className="p-4 text-center text-xs">Carregando resultados...</div>}>
                          <StroopResultCard score={summary} />
                        </React.Suspense>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Card: Corsi (Funcional) */}
      <div className="bg-surface border border-border/60 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
              <Boxes className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-on-surface mb-1">Cubos de Corsi</h4>
              <p className="text-sm text-foreground-muted leading-relaxed">
                Avalia memória de trabalho visuoespacial. 
                Dificuldade progressiva automática (Span).
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCorsiActive(true)} variant="primary" className="shrink-0 !bg-blue-600 hover:!bg-blue-700 !text-white !rounded-xl shadow-sm">
            <Plus size={16} className="mr-2" /> Iniciar Teste
          </Button>
        </div>

        {/* Histórico do Corsi */}
        {corsiRecords.length > 0 && (
          <div className="border-t border-border/60 pt-4 mt-2">
            <h5 className="font-bold text-sm text-foreground-muted mb-3 flex items-center gap-2">
              <Clock size={14} /> Histórico ({corsiRecords.length})
            </h5>
            <div className="space-y-2">
              {[...corsiRecords].reverse().map(record => {
                const summary = record.metadata.summary as any;
                const isExpanded = expandedCorsiId === record.id;
                
                return (
                  <div key={record.id} className="rounded-xl border border-border overflow-hidden bg-background">
                    <button
                      onClick={() => setExpandedCorsiId(isExpanded ? null : record.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-surface-container-high transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-on-surface w-24">
                          {formatDate(record.date).substring(0, 5)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground-muted">Span Direto:</span>
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {summary?.directSpan}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-foreground-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && summary && (
                      <div className="p-4 border-t border-border bg-surface-container-low animate-fadeIn">
                        <React.Suspense fallback={<div className="p-4 text-center text-xs">Carregando resultados...</div>}>
                          <CorsiResultCard score={summary} />
                        </React.Suspense>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitiveTasksPanel;
