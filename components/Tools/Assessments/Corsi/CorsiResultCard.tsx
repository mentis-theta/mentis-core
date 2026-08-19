import React, { useState } from 'react';
import { Boxes, Trophy, Target, AlertTriangle, Bot, Loader2 } from 'lucide-react';
import type { CorsiScore } from '../../../../services/psychometrics/corsiScorer';
import { generateCognitiveAnalysis } from '../../../../services/geminiService';
import { usePatientContext } from '@/contexts/PatientContext';
import Button from '@/components/Button';

interface CorsiResultCardProps {
  score: CorsiScore;
}

const CorsiResultCard: React.FC<CorsiResultCardProps> = ({ score }) => {
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
      const result = await generateCognitiveAnalysis('corsi', score, age, (progress) => {
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
            <Boxes className="text-blue-500 w-6 h-6" />
            Resultados do Corsi
          </h3>
          <p className="text-sm text-foreground-muted mt-1">
            Memória de trabalho visuoespacial e capacidade de retenção em curto prazo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Span Direto */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-6 rounded-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-blue-900/60 dark:text-blue-300/60 uppercase tracking-widest mb-1">Span Direto</p>
          <span className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">
            {score.directSpan}
          </span>
          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed max-w-[200px]">
            Tamanho máximo da sequência que o paciente conseguiu reproduzir corretamente.
          </p>
        </div>

        {/* Tentativas Corretas */}
        <div className="bg-surface-container border border-border p-6 rounded-2xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-1">Total de Acertos</p>
          <span className="text-4xl font-black text-on-surface mb-2">
            {score.totalCorrectTrials} <span className="text-lg font-bold text-foreground-muted">/ {score.totalTrials}</span>
          </span>
          <p className="text-xs text-foreground-muted leading-relaxed max-w-[200px]">
            Número total de sequências reproduzidas com exatidão durante todo o teste.
          </p>
        </div>

        {/* Limiar de Erro */}
        <div className="bg-surface-container border border-border p-6 rounded-2xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-1">Teto Atingido</p>
          <span className="text-4xl font-black text-on-surface mb-2">
            Span {score.maxSpanAttempted}
          </span>
          <p className="text-xs text-foreground-muted leading-relaxed max-w-[200px]">
            Nível máximo alcançado antes de falhar duas vezes consecutivas na mesma dificuldade.
          </p>
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

export default CorsiResultCard;
