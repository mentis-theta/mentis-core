import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Bot, Lightbulb, UserCheck, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateVocationalAnalysis } from '../../../../services/geminiService';
import { RIASEC_TYPE_LABELS, type RiasecScore } from '../../../../services/psychometrics/riasecScorer';
import Button from '@/components/Button';
import { BRAND_COLORS } from '@/utils/colorTokens';

interface RIASECResultCardProps {
  score: RiasecScore;
}

const RIASECResultCard: React.FC<RIASECResultCardProps> = ({ score }) => {
  const { currentUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Transformar os dados para o Recharts (Radar Chart)
  // O hexágono clássico é R-I-A-S-E-C
  const chartData = [
    { subject: 'Realista', A: score.R, fullMark: 40 },
    { subject: 'Investigativo', A: score.I, fullMark: 40 },
    { subject: 'Artístico', A: score.A, fullMark: 40 },
    { subject: 'Social', A: score.S, fullMark: 40 },
    { subject: 'Empreendedor', A: score.E, fullMark: 40 },
    { subject: 'Convencional', A: score.C, fullMark: 40 },
  ];

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    setProgressMsg(null);
    try {
      const result = await generateVocationalAnalysis(score, (progress) => {
        setProgressMsg(progress.status);
      });
      setAiAnalysis(result);
    } catch (error) {
      console.error('Failed to generate analysis', error);
      setAiAnalysis('Falha ao gerar a análise. A Inteligência Artificial pode estar sob alta demanda no momento.');
    } finally {
      setIsGenerating(false);
      setProgressMsg(null);
    }
  };

  const primaryLabel = RIASEC_TYPE_LABELS[score.primaryType];
  const secondaryLabel = RIASEC_TYPE_LABELS[score.secondaryType];
  const tertiaryLabel = RIASEC_TYPE_LABELS[score.tertiaryType];

  return (
    <div className="bg-surface border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm animate-fadeIn">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Lado Esquerdo: Gráfico e Código */}
        <div className="w-full md:w-1/3 flex flex-col items-center">
          <div className="text-center mb-6">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-2">Código Holland</p>
            <div className="flex justify-center gap-2">
              <span className="w-12 h-14 flex items-center justify-center text-3xl font-black text-white rounded-xl shadow-sm" style={{ backgroundColor: primaryLabel.color }}>
                {score.primaryType}
              </span>
              <span className="w-12 h-14 flex items-center justify-center text-3xl font-black text-white rounded-xl shadow-sm opacity-90" style={{ backgroundColor: secondaryLabel.color }}>
                {score.secondaryType}
              </span>
              <span className="w-12 h-14 flex items-center justify-center text-3xl font-black text-white rounded-xl shadow-sm opacity-70" style={{ backgroundColor: tertiaryLabel.color }}>
                {score.tertiaryType}
              </span>
            </div>
          </div>

          <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#334155" opacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[8, 40]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke={BRAND_COLORS.primary} strokeWidth={2} fill={BRAND_COLORS.primary} fillOpacity={0.4} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: BRAND_COLORS.primaryGlow, fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lado Direito: Interpretação e IA */}
        <div className="w-full md:w-2/3 flex flex-col h-full">
          <h3 className="text-lg font-bold text-on-surface mb-4">Tipos Dominantes</h3>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 shrink-0 flex items-center justify-center text-white font-bold rounded-lg shadow-sm" style={{ backgroundColor: primaryLabel.color }}>
                {score.primaryType}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">{primaryLabel.name}</p>
                <p className="text-xs text-foreground-muted leading-relaxed mt-1">{primaryLabel.description}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 shrink-0 flex items-center justify-center text-white font-bold rounded-lg shadow-sm opacity-90" style={{ backgroundColor: secondaryLabel.color }}>
                {score.secondaryType}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">{secondaryLabel.name}</p>
                <p className="text-xs text-foreground-muted leading-relaxed mt-1">{secondaryLabel.description}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-8 h-8 shrink-0 flex items-center justify-center text-white font-bold rounded-lg shadow-sm opacity-70" style={{ backgroundColor: tertiaryLabel.color }}>
                {score.tertiaryType}
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">{tertiaryLabel.name}</p>
                <p className="text-xs text-foreground-muted leading-relaxed mt-1">{tertiaryLabel.description}</p>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-border/60 pt-6">
            {!aiAnalysis ? (
              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Análise Vocacional Avançada</h4>
                </div>
                <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 leading-relaxed mb-4">
                  Gere um rascunho de relatório fundamentado na teoria de Holland cruzando o perfil ({score.hollandCode}) com tendências de mercado e necessidades de adaptação (incluindo perfis neurodivergentes).
                </p>
                <Button 
                  onClick={handleGenerateAnalysis} 
                  disabled={isGenerating}
                  className="w-full !bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-xl"
                >
                  {isGenerating ? progressMsg || 'Gerando Análise...' : 'Gerar Análise com Gemini IA'}
                </Button>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-border/60 rounded-2xl p-5 animate-fadeIn">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-bold text-on-surface">Síntese Vocacional (Gemini IA)</span>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-full">
                    Baseado no Modelo RIASEC
                  </span>
                </div>
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs leading-relaxed">
                  {aiAnalysis.split('\n').map((paragraph, idx) => (
                    paragraph.trim() && <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RIASECResultCard;
