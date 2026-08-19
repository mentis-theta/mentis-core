import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateStroopTrials, type StroopTrial, type StroopColor } from '../../../../services/psychometrics/stroopEngine';
import { scoreStroop } from '../../../../services/psychometrics/stroopScorer';
import { useCognitiveTask } from '../../../../hooks/useCognitiveTask';
import { useDeviceContext } from '../../../../hooks/useDeviceContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import type { CognitiveTaskEvent, CognitiveTaskResult } from '@/types';
import { CheckCircle2, Play, Info } from 'lucide-react';

interface StroopTaskProps {
  patientId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const COLOR_MAPPING: Record<StroopColor, { hex: string, key: string, label: string }> = {
  red: { hex: '#EF4444', key: '1', label: 'Vermelho' },
  blue: { hex: '#3B82F6', key: '2', label: 'Azul' },
  green: { hex: '#22C55E', key: '3', label: 'Verde' },
  yellow: { hex: '#EAB308', key: '4', label: 'Amarelo' },
};

const StroopTask: React.FC<StroopTaskProps> = ({ patientId, onComplete, onCancel }) => {
  const { currentUser } = useAuth();
  const { deviceContext, isReady } = useDeviceContext();
  const { createTaskResult } = useCognitiveTask(patientId);

  const [phase, setPhase] = useState<'instructions' | 'active' | 'finished'>('instructions');
  const [trials, setTrials] = useState<StroopTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events, setEvents] = useState<CognitiveTaskEvent[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Usa useRef para performance.now() crítico para evitar re-render atrasos
  const stimulusOnsetRef = useRef<number>(0);
  // Ref para evitar double-fire em teclas rápidas
  const isProcessingRef = useRef<boolean>(false);

  // Inicializa os trials
  useEffect(() => {
    setTrials(generateStroopTrials());
  }, []);

  const handleStart = () => {
    setPhase('active');
    stimulusOnsetRef.current = performance.now();
  };

  const handleResponse = useCallback((colorResponded: StroopColor, inputMethod: 'keyboard' | 'touch') => {
    if (phase !== 'active' || isProcessingRef.current || currentIndex >= trials.length) return;
    
    isProcessingRef.current = true;
    const responseTime = performance.now() - stimulusOnsetRef.current;
    const currentTrial = trials[currentIndex];

    // Atualiza o contexto do device caso o input mude dinamicamente
    if (deviceContext && deviceContext.inputMethod !== inputMethod) {
       deviceContext.inputMethod = inputMethod;
    }

    const event: CognitiveTaskEvent = {
      timestamp: performance.now(),
      trialIndex: currentIndex,
      stimulusOnset: stimulusOnsetRef.current,
      responseTime,
      response: colorResponded,
      expected: currentTrial.expectedColor,
      isCorrect: colorResponded === currentTrial.expectedColor,
      isOmission: false,
      condition: currentTrial.condition,
    };

    setEvents(prev => [...prev, event]);

    if (currentIndex < trials.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Próximo onset com pequeno delay (ISI - Inter Stimulus Interval) pode ser adicionado aqui, 
      // mas para o Stroop contínuo básico gravamos logo após a montagem do próximo DOM.
      // O React State batching geralmente cuida de setar o próximo frame.
      requestAnimationFrame(() => {
        stimulusOnsetRef.current = performance.now();
        isProcessingRef.current = false;
      });
    } else {
      setPhase('finished');
      isProcessingRef.current = false;
    }
  }, [currentIndex, phase, trials, deviceContext]);

  // Captura de teclado
  useEffect(() => {
    if (phase !== 'active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const match = Object.entries(COLOR_MAPPING).find(([, val]) => val.key === key);
      if (match) {
        handleResponse(match[0] as StroopColor, 'keyboard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  const handleSave = async () => {
    if (!currentUser || !deviceContext) return;
    setIsSaving(true);

    const score = scoreStroop(events);

    const result: CognitiveTaskResult = {
      taskType: 'stroop',
      events,
      deviceContext,
      startedAt: new Date(Date.now() - events.reduce((acc, r) => acc + r.responseTime, 0)).toISOString(),
      completedAt: new Date().toISOString(),
      summary: { ...score },
    };

    const success = await createTaskResult(patientId, currentUser.id, result);
    setIsSaving(false);
    if (success) {
      onComplete();
    }
  };

  if (!isReady || trials.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-surface border border-border/60 rounded-3xl">
        <span className="text-foreground-muted">Iniciando ambiente neuropsicológico...</span>
      </div>
    );
  }

  if (phase === 'instructions') {
    return (
      <div className="bg-surface border border-border/60 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm animate-fadeIn">
        <h3 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-3">
          <Info className="text-primary" />
          Teste de Stroop (Atenção Seletiva)
        </h3>
        
        <div className="space-y-4 text-sm text-on-surface/80 leading-relaxed mb-8">
          <p>
            O objetivo deste teste é identificar a <strong>COR DA TINTA</strong> na qual a palavra está escrita, 
            ignorando a palavra em si.
          </p>
          <div className="bg-surface-container p-4 rounded-xl border border-border">
            <p className="font-bold mb-2">Métodos de Resposta:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Teclado:</strong> Use as teclas <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-xs">1</kbd> (Vermelho), <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-xs">2</kbd> (Azul), <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-xs">3</kbd> (Verde), <kbd className="bg-background px-1.5 py-0.5 rounded border border-border text-xs">4</kbd> (Amarelo).</li>
              <li><strong>Touch/Mouse:</strong> Clique nos botões correspondentes que aparecerão na tela.</li>
            </ul>
          </div>
          <p className="text-red-500 dark:text-red-400 font-bold">
            Atenção: Responda o mais rápido possível sem cometer erros. O fundo da tela ficará cinza escuro para maximizar o contraste.
          </p>
        </div>

        <div className="flex gap-4 justify-end border-t border-border/60 pt-6">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={handleStart} className="!bg-indigo-600 hover:!bg-indigo-700 !text-white">
            <Play size={16} className="mr-2" /> Iniciar Teste (100 trials)
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className="bg-surface border border-border/60 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm text-center animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-2xl font-bold text-on-surface mb-2">Avaliação Concluída</h3>
        <p className="text-foreground-muted mb-8">
          Todos os 100 trials foram registrados. 
          Os tempos de reação (milissegundos) e efeito de interferência foram calculados.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="ghost" onClick={onCancel}>Descartar</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving} className="!bg-indigo-600 hover:!bg-indigo-700 !text-white">
            {isSaving ? 'Salvando...' : 'Salvar no Prontuário'}
          </Button>
        </div>
      </div>
    );
  }

  // Active Phase - ESTÉTICA NEUTRA E ESTRITA (#808080)
  // Sem animações, sem firulas. Pura precisão laboratorial.
  const currentTrial = trials[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: '#808080' }} // Cinza neutro absoluto padrão laboratorial
    >
      <div className="text-center mb-16">
        <h1 
          className="text-7xl font-black uppercase tracking-widest"
          style={{ color: COLOR_MAPPING[currentTrial.color].hex, fontFamily: 'sans-serif' }}
        >
          {currentTrial.word}
        </h1>
      </div>

      {/* Grid 2x2 para Touch/Mouse - Centralizado abaixo */}
      <div className="grid grid-cols-2 gap-4 max-w-xs w-full px-4">
        {Object.entries(COLOR_MAPPING).map(([colorKey, data]) => (
          <button
            key={colorKey}
            onPointerDown={(e) => {
              // onPointerDown é mais rápido que onClick em dispositivos touch
              e.preventDefault();
              handleResponse(colorKey as StroopColor, 'touch');
            }}
            className="h-24 rounded-2xl shadow-md border-2 border-transparent active:border-white/50 transition-none"
            style={{ backgroundColor: data.hex }}
          >
            <span className="text-white font-bold opacity-0">{data.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StroopTask;
