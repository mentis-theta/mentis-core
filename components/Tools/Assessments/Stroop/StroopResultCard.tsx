import React, { useState } from 'react';
import { Zap, AlertTriangle, CheckCircle, Clock, Bot, Loader2 } from 'lucide-react';
import type { StroopScore } from '../../../../services/psychometrics/stroopScorer';
import { generateCognitiveAnalysis } from '../../../../services/geminiService';
import { usePatientContext } from '@/contexts/PatientContext';
import Button from '@/components/Button';

interface StroopResultCardProps {
  score: StroopScore;
}

const StroopResultCard: React.FC<StroopResultCardProps> = ({ score }) => {
  const { patient } = usePatientContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const calculateAge = (dob?: string) => {
    if (!dob) return 'Idade não informada';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    setProgressMsg(null);
    try {
      const age = calculateAge(patient?.birthDate);
      const result = await generateCognitiveAnalysis('stroop', score, age, (progress) => {
        setProgressMsg(progress.status);
      });
      setAiAnalysis(result);
    } catch (error) {
      console.error('Failed to generate cognitive analysis', error);
      setAiAnalysis('Falha ao gerar a análise psicoeducativa. A Inteligência Artificial pode estar sob alta demanda no momento.');
    } finally {
      setIsGenerating(false);
      setProgressMsg(null);
    }
  };

  return (
    <div className="bg-surface border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-6 mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Zap className="text-rose-500 w-6 h-6" />
            Resultados do Stroop
          </h3>
          <p className="text-sm text-foreground-muted mt-1">
            Atenção seletiva, inibição e velocidade de processamento.
          </p>
        </div>
        
        {/* Metadados Básicos */}
        <div className="flex gap-4">
          <div className="bg-surface-container-high px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Acurácia</p>
            <p className={`text-lg font-black ${score.overallAccuracy < 80 ? 'text-orange-500' : 'text-emerald-500'}`}>
              {score.overallAccuracy}%
            </p>
          </div>
          <div className="bg-surface-container-high px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Omissões</p>
            <p className="text-lg font-black text-on-surface">{score.omissions}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lado Esquerdo: Efeitos (Interferência/Facilitação) */}
        <div className="space-y-6">
          <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">Métricas Clínicas (Efeitos)</h4>
          
          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span className="font-bold text-rose-900 dark:text-rose-300">Efeito de Interferência</span>
              </div>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {score.interferenceEffectMs} <span className="text-sm font-bold opacity-60">ms</span>
              </span>
            </div>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed relative z-10">
              Diferença de tempo de reação entre estímulos Incongruentes e Congruentes. 
              Mede o custo cognitivo global para inibir a leitura automática da palavra. 
              (Valores altos indicam maior dificuldade inibitória).
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-emerald-900 dark:text-emerald-300">Efeito de Facilitação</span>
              </div>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {score.facilitationEffectMs} <span className="text-sm font-bold opacity-60">ms</span>
              </span>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed relative z-10">
              Diferença entre estímulos Neutros e Congruentes. 
              Mede o benefício na velocidade de processamento quando texto e cor combinam.
            </p>
          </div>
        </div>

        {/* Lado Direito: Tempos de Reação por Condição */}
        <div>
          <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">Tempos de Reação (Acertos)</h4>
          <div className="space-y-3">
            
            {/* Condição Congruente */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-border">
              <div>
                <p className="text-sm font-bold text-on-surface">Condição Congruente</p>
                <p className="text-xs text-foreground-muted">Ex: PALAVRA AZUL na TINTA AZUL</p>
                <p className="text-[10px] text-foreground-muted mt-1">{score.congruent.correct}/{score.congruent.count} acertos</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="text-lg font-black text-on-surface">
                  {score.congruent.meanRT} <span className="text-xs font-bold text-foreground-muted">ms</span>
                </span>
              </div>
            </div>

            {/* Condição Neutra */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-border">
              <div>
                <p className="text-sm font-bold text-on-surface">Condição Neutra</p>
                <p className="text-xs text-foreground-muted">Ex: PALAVRA CARRO na TINTA AZUL</p>
                <p className="text-[10px] text-foreground-muted mt-1">{score.neutral.correct}/{score.neutral.count} acertos</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-lg font-black text-on-surface">
                  {score.neutral.meanRT} <span className="text-xs font-bold text-foreground-muted">ms</span>
                </span>
              </div>
            </div>

            {/* Condição Incongruente */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-border">
              <div>
                <p className="text-sm font-bold text-on-surface">Condição Incongruente</p>
                <p className="text-xs text-foreground-muted">Ex: PALAVRA VERMELHO na TINTA AZUL</p>
                <p className="text-[10px] text-foreground-muted mt-1">{score.incongruent.correct}/{score.incongruent.count} acertos</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span className="text-lg font-black text-on-surface">
                  {score.incongruent.meanRT} <span className="text-xs font-bold text-foreground-muted">ms</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Seção de Psicoeducação com IA */}
      <div className="border-t border-border/60 pt-6 mt-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Síntese Psicoeducativa (IA)
            </h4>
            <p className="text-xs text-foreground-muted mt-1">
              Tradução dos resultados brutos em linguagem acessível para o paciente, contextualizada por idade.
            </p>
          </div>
          {!aiAnalysis && (
            <Button 
              variant="secondary" 
              onClick={handleGenerateAnalysis} 
              disabled={isGenerating}
              className="whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progressMsg || 'Sintetizando...'}
                </>
              ) : (
                'Gerar Explicação para o Paciente'
              )}
            </Button>
          )}
        </div>

        {aiAnalysis && (
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-2xl">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-indigo-950 dark:prose-p:text-indigo-200">
              {aiAnalysis.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
              ))}
            </div>
            <div className="mt-4 flex justify-end">
               <Button variant="ghost" size="sm" onClick={() => setAiAnalysis(null)} className="text-indigo-600 dark:text-indigo-400">
                 Ocultar Síntese
               </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default StroopResultCard;
