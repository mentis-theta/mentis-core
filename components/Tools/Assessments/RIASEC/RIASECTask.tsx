import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { RIASEC_ITEMS } from '../../../../services/psychometrics/riasecItems';
import { scoreRiasec } from '../../../../services/psychometrics/riasecScorer';
import { useCognitiveTask } from '../../../../hooks/useCognitiveTask';
import { useDeviceContext } from '../../../../hooks/useDeviceContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import type { CognitiveTaskEvent, CognitiveTaskResult } from '@/types';

interface RIASECTaskProps {
  patientId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const RIASECTask: React.FC<RIASECTaskProps> = ({ patientId, onComplete, onCancel }) => {
  const { currentUser } = useAuth();
  const { deviceContext, isReady } = useDeviceContext();
  const { createTaskResult } = useCognitiveTask(patientId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<CognitiveTaskEvent[]>([]);
  const [itemStartTime, setItemStartTime] = useState<number>(performance.now());
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentItem = RIASEC_ITEMS[currentIndex];
  const progress = Math.round((currentIndex / RIASEC_ITEMS.length) * 100);

  const handleResponse = (value: number) => {
    const responseTime = performance.now() - itemStartTime;

    const event: CognitiveTaskEvent = {
      timestamp: performance.now(),
      trialIndex: currentIndex,
      stimulusOnset: itemStartTime,
      responseTime,
      response: value,
      expected: '',
      isCorrect: true,
      isOmission: false,
      condition: currentItem.type,
    };

    setResponses(prev => [...prev, event]);

    if (currentIndex < RIASEC_ITEMS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setItemStartTime(performance.now());
    } else {
      setIsFinished(true);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !deviceContext) return;
    setIsSaving(true);

    const scoreInputs = responses.map((r, idx) => ({
      type: RIASEC_ITEMS[idx].type,
      value: r.response as number,
    }));

    const score = scoreRiasec(scoreInputs);

    const result: CognitiveTaskResult = {
      taskType: 'riasec',
      events: responses,
      deviceContext,
      startedAt: new Date(Date.now() - responses.reduce((acc, r) => acc + r.responseTime, 0)).toISOString(),
      completedAt: new Date().toISOString(),
      summary: { ...score },
    };

    const success = await createTaskResult(patientId, currentUser.id, result);
    setIsSaving(false);
    if (success) {
      onComplete();
    }
  };

  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-64 bg-surface border border-border/60 rounded-3xl">
        <span className="text-foreground-muted">Iniciando ambiente de avaliação...</span>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="bg-surface border border-border/60 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm text-center animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-bold text-on-surface mb-2">Avaliação Concluída</h3>
        <p className="text-foreground-muted mb-8">
          Todas as {RIASEC_ITEMS.length} questões foram respondidas. 
          O perfil Holland já foi calculado.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="ghost" onClick={onCancel}>
            Descartar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving} className="!bg-indigo-600 hover:!bg-indigo-700 !text-white">
            {isSaving ? 'Salvando...' : 'Salvar no Prontuário'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      {/* Header / Progress */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground-muted uppercase tracking-wider">Progresso</span>
            <span className="text-sm font-bold text-primary">{currentIndex + 1} / {RIASEC_ITEMS.length}</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="ml-8 p-2 rounded-xl text-foreground-muted hover:bg-surface-container-high transition-colors"
          title="Cancelar Avaliação"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Card Container */}
      <div className="relative h-64 w-full perspective-1000">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 bg-surface border-2 border-border/80 shadow-md rounded-3xl flex flex-col justify-center items-center p-8 text-center"
          >
            <span className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">
              O quanto você gostaria de...
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface leading-tight">
              "{currentItem.text}"
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Respostas Likert */}
      <div className="mt-8 grid grid-cols-5 gap-3">
        {[
          { val: 1, label: 'Desagrado Total', color: 'hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-800' },
          { val: 2, label: 'Desagrado', color: 'hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-900/20 dark:hover:border-orange-800' },
          { val: 3, label: 'Indiferente', color: 'hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-900/20 dark:hover:border-slate-800' },
          { val: 4, label: 'Agrado', color: 'hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800' },
          { val: 5, label: 'Agrado Total', color: 'hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-800' },
        ].map((option) => (
          <button
            key={option.val}
            onClick={() => handleResponse(option.val)}
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl
              bg-surface border border-border shadow-sm
              transition-all duration-200
              ${option.color} group
            `}
          >
            <span className="text-2xl font-black text-on-surface mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
              {option.val}
            </span>
            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider text-center">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RIASECTask;
