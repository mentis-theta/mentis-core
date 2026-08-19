import React, { useState, useEffect, useRef } from 'react';
import { CORSI_BLOCKS, generateCorsiSequences, type CorsiTrial } from '../../../../services/psychometrics/corsiEngine';
import { scoreCorsi } from '../../../../services/psychometrics/corsiScorer';
import { useCognitiveTask } from '../../../../hooks/useCognitiveTask';
import { useDeviceContext } from '../../../../hooks/useDeviceContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button';
import type { CognitiveTaskEvent, CognitiveTaskResult } from '@/types';
import { CheckCircle2, Play, Info } from 'lucide-react';

interface CorsiTaskProps {
  patientId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Phase = 'instructions' | 'observation' | 'input' | 'finished';

const CorsiTask: React.FC<CorsiTaskProps> = ({ patientId, onComplete, onCancel }) => {
  const { currentUser } = useAuth();
  const { deviceContext, isReady } = useDeviceContext();
  const { createTaskResult } = useCognitiveTask(patientId);

  const [phase, setPhase] = useState<Phase>('instructions');
  const [trials, setTrials] = useState<CorsiTrial[]>([]);
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  
  // Controle de estado da UI durante a tarefa
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [patientSequence, setPatientSequence] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Histórico de eventos e controle de erros
  const [events, setEvents] = useState<CognitiveTaskEvent[]>([]);
  const [failsAtCurrentSpan, setFailsAtCurrentSpan] = useState(0);

  // Refs de tempo
  const trialOnsetRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const clickLatenciesRef = useRef<number[]>([]);

  useEffect(() => {
    setTrials(generateCorsiSequences());
  }, []);

  // Lógica de Apresentação da Sequência
  useEffect(() => {
    if (phase !== 'observation' || currentTrialIdx >= trials.length) return;

    const trial = trials[currentTrialIdx];
    let step = 0;
    
    // Inicia a sequência com um delay inicial
    let timerId = setTimeout(() => {
      playSequenceStep();
    }, 1000);

    const playSequenceStep = () => {
      if (step < trial.sequence.length) {
        // Acende o bloco (1000ms)
        setActiveBlockId(trial.sequence[step]);
        
        setTimeout(() => {
          // Apaga o bloco
          setActiveBlockId(null);
          step++;
          
          // Intervalo entre blocos (500ms) ou fim da sequência
          if (step < trial.sequence.length) {
            timerId = setTimeout(playSequenceStep, 500);
          } else {
            // Fim da apresentação. Libera para input após 500ms
            timerId = setTimeout(() => {
              setPatientSequence([]);
              clickLatenciesRef.current = [];
              trialOnsetRef.current = performance.now();
              lastClickTimeRef.current = performance.now();
              setPhase('input');
            }, 500);
          }
        }, 1000); // Duração do bloco aceso
      }
    };

    return () => clearTimeout(timerId);
  }, [phase, currentTrialIdx, trials]);

  const handleStart = () => {
    setPhase('observation');
  };

  const handleBlockClick = (blockId: number) => {
    if (phase !== 'input') return;

    // Registra latência intra-clique
    const now = performance.now();
    const latency = now - lastClickTimeRef.current;
    clickLatenciesRef.current.push(latency);
    lastClickTimeRef.current = now;

    const newSequence = [...patientSequence, blockId];
    setPatientSequence(newSequence);

    // Efeito de feedback tátil/visual imediato (apenas pisca o CSS active)
    
    const trial = trials[currentTrialIdx];
    
    // Verifica se completou a sequência
    if (newSequence.length === trial.sequence.length) {
      processTrialCompletion(newSequence);
    }
  };

  const processTrialCompletion = (finalSequence: number[]) => {
    const trial = trials[currentTrialIdx];
    const expectedStr = trial.sequence.join(',');
    const responseStr = finalSequence.join(',');
    const isCorrect = expectedStr === responseStr;
    
    // Salva o evento
    const event: CognitiveTaskEvent = {
      timestamp: performance.now(),
      trialIndex: currentTrialIdx,
      level: trial.span,
      stimulusOnset: trialOnsetRef.current,
      responseTime: clickLatenciesRef.current.reduce((a,b)=>a+b, 0), // RT total da sequência
      response: responseStr,
      expected: expectedStr,
      isCorrect,
      isOmission: false,
      condition: 'corsi_span',
      metadata: {
        intraClickLatenciesMs: clickLatenciesRef.current
      }
    };
    
    setEvents(prev => [...prev, event]);

    const isLastTrialOfSpan = currentTrialIdx + 1 >= trials.length || trials[currentTrialIdx + 1].span !== trial.span;
    
    if (isCorrect) {
      // Acertou. Continua no protocolo. Se for o último do span, reseta os erros para o próximo nível.
      if (isLastTrialOfSpan) setFailsAtCurrentSpan(0);
      
      if (currentTrialIdx + 1 < trials.length) {
        setCurrentTrialIdx(currentTrialIdx + 1);
        setPhase('observation');
      } else {
        setPhase('finished'); // Chegou no Max Span geral
      }
    } else {
      // Errou
      const newFails = failsAtCurrentSpan + 1;
      if (newFails >= 2) {
        // Errou 2 vezes no MESMO span -> Encerra o teste (Teto)
        setPhase('finished');
      } else {
        // Falhou na 1ª tentativa deste span.
        // Se, por alguma anomalia de configuração, fosse o último trial do span, zeraríamos,
        // mas sendo 2 trials/span, ele fará a 2ª tentativa.
        if (isLastTrialOfSpan) setFailsAtCurrentSpan(0);
        else setFailsAtCurrentSpan(newFails);

        if (currentTrialIdx + 1 < trials.length) {
          setCurrentTrialIdx(currentTrialIdx + 1);
          setPhase('observation');
        } else {
          setPhase('finished');
        }
      }
    }
  };

  const handleSave = async () => {
    if (!currentUser || !deviceContext) return;
    setIsSaving(true);

    const score = scoreCorsi(events);

    const result: CognitiveTaskResult = {
      taskType: 'corsi',
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
        <span className="text-foreground-muted">Iniciando motor espacial...</span>
      </div>
    );
  }

  if (phase === 'instructions') {
    return (
      <div className="bg-surface border border-border/60 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm animate-fadeIn">
        <h3 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-3">
          <Info className="text-primary" />
          Cubos de Corsi (Memória Visuoespacial)
        </h3>
        <div className="space-y-4 text-sm text-on-surface/80 leading-relaxed mb-8">
          <p>
            O objetivo deste teste é reproduzir a sequência de blocos que se iluminam na tela.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Aguarde até que <strong>todos os blocos da sequência pisquem</strong>.</li>
            <li>Quando a tela for liberada, clique nos blocos <strong>na mesma ordem</strong>.</li>
            <li>A dificuldade aumentará gradativamente.</li>
            <li>O teste encerra automaticamente após dois erros no mesmo nível.</li>
          </ul>
        </div>
        <div className="flex gap-4 justify-end border-t border-border/60 pt-6">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={handleStart} className="!bg-indigo-600 hover:!bg-indigo-700 !text-white">
            <Play size={16} className="mr-2" /> Iniciar Avaliação
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
          Span Direto máximo alcançado. Resultados compilados.
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

  // Active Phase (Observation or Input)
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface select-none">
      
      {/* Header Info (opcional - pode ser ocultado se quiser isolamento total) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-surface-container-highest border border-border">
        <span className="text-sm font-bold text-on-surface">
          {phase === 'observation' ? 'Observe a sequência...' : 'Sua vez: Reproduza a sequência'}
        </span>
      </div>

      <div className="absolute top-8 right-8">
        <Button variant="ghost" onClick={onCancel} className="!text-foreground-muted">Sair</Button>
      </div>

      {/* Container de Aspect Ratio Restrito */}
      {/* O container precisa ser quadrado (aspect-square) para que % de top e left representem a mesma distância X e Y. */}
      {/* Width 90vw max, height 80vh max - forçando quadrado. */}
      <div 
        className="relative bg-surface-container/30 rounded-xl"
        style={{ width: 'min(90vw, 70vh)', height: 'min(90vw, 70vh)' }}
      >
        {CORSI_BLOCKS.map(block => {
          const isLit = phase === 'observation' && activeBlockId === block.id;
          
          return (
            <button
              key={block.id}
              disabled={phase !== 'input'}
              onPointerDown={(e) => {
                e.preventDefault();
                handleBlockClick(block.id);
              }}
              // As classes CSS determinam a transição suave de cor (transition-colors duration-300).
              // Active press: escurece ou brilha instantaneamente sem animação de delay (duration-0).
              className={`
                absolute w-[12%] h-[12%] rounded-xl shadow-md border border-border/20
                ${isLit 
                  ? 'bg-blue-500 shadow-blue-500/50 shadow-lg scale-[1.02] transition-all duration-200' 
                  : 'bg-surface-container-high transition-all duration-300'}
                ${phase === 'input' ? 'cursor-pointer active:bg-blue-400 active:scale-95 active:duration-75' : 'cursor-default'}
              `}
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              aria-label={`Block ${block.id}`}
            />
          );
        })}
      </div>

      {/* Barra de progresso visual de clicks do paciente */}
      {phase === 'input' && (
        <div className="absolute bottom-12 flex gap-2">
          {trials[currentTrialIdx].sequence.map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full transition-colors ${i < patientSequence.length ? 'bg-blue-500' : 'bg-border'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CorsiTask;
