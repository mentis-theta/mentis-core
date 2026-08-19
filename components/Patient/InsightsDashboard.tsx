
import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, StoredClinicalInsight } from '@/types.ts';
import Button from '../Button.tsx';
import { SparklesIcon, LightBulbIcon, ExclamationIcon } from '../Icons';
import { formatDate, formatShortDateTime } from '@/utils/formatters.ts';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';

interface InsightsDashboardProps {
  patient: Patient;
  onGenerate: (mode: 'summary' | 'sabatina') => void;
  isLoading: boolean;
}

const InsightSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-[32px] border border-border/40 bg-surface-container-lowest p-8 shadow-sm transition-colors duration-200">
    <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-6">{title}</h3>
    <div className="space-y-3 text-foreground-muted ">{children}</div>
  </div>
);

const AIDisclaimer: React.FC = () => (
  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800/50">
    <div className="flex">
      <div className="flex-shrink-0">
        <ExclamationIcon className="h-5 w-5 text-yellow-400" />
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Atenção: Análise Gerada por IA</h3>
        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
          <p>
            A IA pode cometer erros. Esta função é uma ferramenta auxiliar para guiar o profissional a identificar pontos de interesse para investigação e não substitui o julgamento clínico.
          </p>
          <p className="mt-1 font-bold text-yellow-900 dark:text-yellow-200">
            O Mentis é uma ferramenta de apoio. O raciocínio clínico, o diagnóstico e a conduta ética são de responsabilidade exclusiva do psicólogo (Resolução CFP).
          </p>
        </div>
      </div>
    </div>
  </div>
);

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ patient, onGenerate, isLoading }) => {
  const formatText = (text: string) => text ? text.replaceAll('[PACIENTE]', patient.name) : text;
  const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'clinical_evolution');
  const patientSessions = decoupledData?.sessions || [];

  const sortedInsights = useMemo(() =>
    [...(patient.insights || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [patient.insights]
  );

  const hasEmptySessions = useMemo(() => {
    if (patientSessions.length === 0) return true;
    return patientSessions.every(s => {
      if (!s.notes) return true;
      if (typeof s.notes === 'string') return s.notes.trim().length < 10;
      return false;
    });
  }, [patientSessions]);

  const [generationMode, setGenerationMode] = useState<'summary' | 'sabatina'>('sabatina');

  const filteredInsights = useMemo(() => {
    return sortedInsights.filter(insight => {
      const insightMode = insight.mode || 'summary';
      return insightMode === generationMode;
    });
  }, [sortedInsights, generationMode]);

  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  useEffect(() => {
    const latestInsightId = filteredInsights[0]?.id || null;
    setSelectedInsightId(latestInsightId);
  }, [filteredInsights, generationMode]);

  const selectedInsight = useMemo(() =>
    filteredInsights.find(i => i.id === selectedInsightId),
    [selectedInsightId, filteredInsights]
  );

  const analyzedSessions = useMemo(() => {
    if (!selectedInsight) return [];
    return patientSessions.filter(s => selectedInsight.analyzedSessionIds.includes(s.id));
  }, [selectedInsight, patientSessions]);

  const sessionsDateRange = useMemo(() => {
    if (analyzedSessions.length === 0) return null;
    const dates = analyzedSessions.map(s => new Date(s.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return {
      start: formatDate(minDate.toISOString()),
      end: formatDate(maxDate.toISOString()),
    };
  }, [analyzedSessions]);


  const renderInsightContent = (insight: StoredClinicalInsight) => {
    const isSabatina = insight.mode === 'sabatina';

    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/40 bg-surface p-6">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Contexto da Análise {isSabatina ? '(Sabatina do Supervisor)' : '(Resumo da Evolução)'}</h3>
          <p className="text-sm text-foreground-muted mt-2">
            <strong>Gerado em:</strong> {formatShortDateTime(insight.createdAt)}<br />
            <strong>Sessões Analisadas:</strong> {insight.analyzedSessionIds.length}
            {sessionsDateRange && ` (de ${sessionsDateRange.start} a ${sessionsDateRange.end})`}
          </p>
        </div>
        
        {insight.is_red_flag_alert && (
          <div className="rounded-md bg-red-600 p-4 border border-red-800 shadow-lg animate-pulse">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-black text-white uppercase">ALERTA DE RISCO IMINENTE (RED FLAG)</h3>
                <div className="mt-2 text-sm text-red-50">
                  <p className="font-medium whitespace-pre-wrap">{insight.red_flag_reason || "Foi detectado um possível risco iminente de vida, abuso ou violência."}</p>
                  <p className="mt-2 font-bold underline">Consulte imediatamente os protocolos de emergência clínica e quebra de sigilo ético (Resolução CFP).</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <AIDisclaimer />

        {insight.raciocinio_clinico && (
          <details className="group rounded-md border border-border/40 bg-surface px-4 py-3 cursor-pointer">
            <summary className="font-semibold text-sm text-foreground-muted flex items-center justify-between">
              <span className="flex items-center gap-2">👁️ Ver Deliberação Oculta da IA (Raciocínio Clínico)</span>
              <span className="text-xl group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="mt-3 text-sm text-foreground-muted whitespace-pre-wrap border-t border-border/40 pt-3">
              {formatText(insight.raciocinio_clinico)}
            </div>
          </details>
        )}


        <InsightSection title="Visão Geral">
          <p className="whitespace-pre-wrap break-words">{formatText(insight.summary)}</p>
        </InsightSection>

        {isSabatina ? (
          <>
            {insight.blindSpots && insight.blindSpots.length > 0 && (
              <InsightSection title="Pontos Cegos & Contratransferência">
                <ul className="list-disc list-inside space-y-1">
                  {insight.blindSpots.map((item: string, index: number) => <li key={index} className="break-words">{formatText(item)}</li>)}
                </ul>
              </InsightSection>
            )}

            {insight.technicalCritique && insight.technicalCritique.length > 0 && (
              <InsightSection title="Validação Técnica">
                <ul className="list-disc list-inside space-y-1">
                  {insight.technicalCritique.map((item: string, index: number) => <li key={index} className="break-words">{formatText(item)}</li>)}
                </ul>
              </InsightSection>
            )}

            {insight.practicalManagement && insight.practicalManagement.length > 0 && (
              <InsightSection title="Sugestões de Manejo Prático">
                <ul className="list-decimal list-inside space-y-2">
                  {insight.practicalManagement.map((item: string, index: number) => <li key={index} className="break-words">{formatText(item)}</li>)}
                </ul>
              </InsightSection>
            )}

            {insight.ethicalAlerts && insight.ethicalAlerts.length > 0 && (
              <InsightSection title="Alertas Éticos">
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400">
                  {insight.ethicalAlerts.map((item: string, index: number) => <li key={index} className="break-words">{formatText(item)}</li>)}
                </ul>
              </InsightSection>
            )}
          </>
        ) : (
          <>
            {insight.sources && insight.sources.length > 0 && (
              <InsightSection title="Fontes de Referência Utilizadas">
                <p className="text-sm text-foreground-muted mb-4">
                  Trechos da literatura especializada e diretrizes consultados pela IA para embasar esta análise:
                </p>
                <div className="space-y-3">
                  {insight.sources.map((source, index) => (
                    <details key={index} className="group bg-surface dark:bg-slate-700/50 border border-border rounded-lg p-3 open:bg-slate-50 dark:open:bg-slate-800/50 transition-colors">
                      <summary className="font-semibold text-on-surface cursor-pointer text-sm flex items-center justify-between">
                        {source.source.replace(/-/g, ' ')}
                        <span className="text-xs text-foreground-muted font-normal group-open:hidden">Ver trecho consultado</span>
                      </summary>
                      <div className="mt-3 pl-3 border-l-2 border-primary/30 text-[13px] text-foreground-muted italic whitespace-pre-wrap break-words leading-relaxed">
                        "{source.content.trim()}"
                      </div>
                    </details>
                  ))}
                </div>
              </InsightSection>
            )}

            {insight.goalProgress && (
              <InsightSection title="Progresso nas Metas">
                {insight.goalProgress.length > 0 ? (
                  <ul className="space-y-4">
                    {insight.goalProgress.map(goal => (
                      <li key={goal.goalTitle}>
                        <h4 className="font-semibold text-on-surface ">{goal.goalTitle}</h4>
                        <p className="text-sm text-foreground-muted mb-1">{goal.linkedSessionsCount} sessões vinculadas</p>
                        <p className="whitespace-pre-wrap text-foreground-muted break-words">{goal.progressSummary}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="italic text-foreground-muted ">Nenhuma meta em andamento para analisar.</p>}
              </InsightSection>
            )}

            {insight.emergingThemes && insight.emergingThemes.length > 0 && (
              <InsightSection title="Temas Emergentes">
                <ul className="list-disc list-inside space-y-1">
                  {insight.emergingThemes.map((theme, index) => <li key={index} className="break-words">{theme}</li>)}
                </ul>
              </InsightSection>
            )}

            {insight.nextStepSuggestions && insight.nextStepSuggestions.length > 0 && (
              <InsightSection title="Sugestões de Próximos Passos">
                <ul className="list-decimal list-inside space-y-2">
                  {insight.nextStepSuggestions.map((suggestion, index) => <li key={index} className="break-words">{suggestion}</li>)}
                </ul>
              </InsightSection>
            )}
          </>
        )}
      </div>
    );
  };

  const renderEmptyState = () => (
      <div className="text-center p-8 bg-surface rounded-[32px] border border-border/40 flex flex-col items-center justify-center h-full min-h-[400px]">
        <LightBulbIcon className="mx-auto h-12 w-12 text-foreground-muted " />
        <h3 className="mt-4 text-xl font-semibold text-foreground-muted ">Obtenha Insights Clínicos com IA</h3>
        <p className="mt-2 max-w-xl mx-auto text-foreground-muted ">
          {generationMode === 'sabatina' 
            ? 'Clique no botão abaixo para gerar uma Sabatina Clínica focada na sua conduta técnica e relação terapêutica.'
            : 'Clique no botão abaixo para que a IA analise o histórico completo de sessões e resuma a evolução do paciente.'}
        </p>
        <div className="mt-6 flex flex-col items-center gap-4">
          {/* Removido o seletor daqui porque ele já está na sidebar e não precisamos duplicar */}
          {hasEmptySessions && (
            <div className="w-full rounded-md bg-red-50 dark:bg-red-900/20 p-3 mt-4 border border-red-200 dark:border-red-800/50 flex items-start gap-2 text-left">
              <ExclamationIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-red-700 dark:text-red-400">
                <strong>Atenção:</strong> A IA precisa do conteúdo das sessões (anotações textuais) para poder analisar. Escreva suas anotações no Prontuário Oficial antes de solicitar uma análise.
              </p>
            </div>
          )}

          <Button 
            onClick={() => onGenerate(generationMode)} 
            isLoading={isLoading}
            disabled={hasEmptySessions}
          >
            <SparklesIcon className="mr-2 h-5 w-5" />
            {isLoading ? 'Analisando...' : 'Gerar Primeiro Insight'}
          </Button>
        </div>
        <div className="mt-8 max-w-2xl mx-auto text-left">
          <AIDisclaimer />
        </div>
      </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar with history */}
      <aside className="lg:col-span-1">
        <div className="rounded-[32px] border border-border/40 bg-surface-container-lowest p-6 shadow-sm sticky top-6">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-6">Histórico de Análises</h3>
          <div className="mb-4 space-y-3">
            <div className="flex bg-surface-container-low rounded-lg p-1 border border-border/40 w-full">
              <button
                onClick={() => setGenerationMode('sabatina')}
                className={`flex-1 px-2 py-1.5 rounded-md text-[13px] font-semibold transition-all ${generationMode === 'sabatina' ? 'bg-surface shadow-sm text-primary' : 'text-foreground-muted'}`}
              >
                Sabatina
              </button>
              <button
                onClick={() => setGenerationMode('summary')}
                className={`flex-1 px-2 py-1.5 rounded-md text-[13px] font-semibold transition-all ${generationMode === 'summary' ? 'bg-surface shadow-sm text-primary' : 'text-foreground-muted'}`}
              >
                Resumo
              </button>
            </div>

            {hasEmptySessions && (
              <div className="w-full rounded-md bg-red-50 dark:bg-red-900/20 p-2 mb-2 border border-red-200 dark:border-red-800/50 flex items-start gap-2">
                <ExclamationIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] leading-tight text-red-700 dark:text-red-400">
                  Adicione anotações nas sessões para permitir novas análises.
                </p>
              </div>
            )}

            <Button 
                onClick={() => onGenerate(generationMode)} 
                isLoading={isLoading} 
                className="w-full"
                disabled={hasEmptySessions}
            >
              <SparklesIcon className="mr-2 h-5 w-5" />
              {isLoading ? 'Analisando...' : 'Gerar Novo Insight'}
            </Button>
          </div>
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredInsights.length === 0 ? (
                <li className="text-center text-sm text-foreground-muted p-4">
                    Nenhuma análise encontrada para este formato.
                </li>
            ) : (
                filteredInsights.map(insight => (
                <li key={insight.id}>
                    <button
                    onClick={() => setSelectedInsightId(insight.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${selectedInsightId === insight.id ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                    <p className="font-semibold text-sm text-on-surface ">
                        {insight.mode === 'sabatina' ? 'Sabatina' : 'Resumo'} de {formatDate(insight.createdAt)}
                    </p>
                    <p className="text-xs text-foreground-muted ">{insight.analyzedSessionIds.length} sessões analisadas</p>
                    </button>
                </li>
                ))
            )}
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <section className="lg:col-span-2">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-foreground-muted mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 font-semibold text-foreground-muted ">Gerando novos insights...</p>
            </div>
          </div>
        )}
        
        {isLoadingDecoupled ? (
          <div className="flex flex-col items-center justify-center p-12 h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mt-4 text-sm text-foreground-muted">Descriptografando histórico clínico...</span>
          </div>
        ) : filteredInsights.length === 0 ? renderEmptyState() : (
          selectedInsight ? renderInsightContent(selectedInsight) : (
            <div className="flex h-full items-center justify-center p-12 text-center rounded-lg border-2 border-dashed border-border ">
              <p className=" text-foreground-muted ">Selecione uma análise do histórico para visualizar.</p>
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default InsightsDashboard;
