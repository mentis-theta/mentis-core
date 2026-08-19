import React from 'react';
import type { CopilotResult, ProblemNode } from '@/types/copilot';
import { ClinicalAssertionCard } from './ClinicalAssertionCard';
import { Target, Activity, AlertTriangle, Lightbulb, ListTodo, Route, CheckCircle2 } from 'lucide-react';

interface CaseFormulationBoardProps {
  result: CopilotResult;
}

export const CaseFormulationBoard: React.FC<CaseFormulationBoardProps> = ({ result }) => {
  const { formulation } = result;
  const problemsList = Object.values(formulation.problems);

  const getPriorityColor = (priority: ProblemNode['assessment']['clinicalPriority']) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-6">
      
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
          <Route className="w-5 h-5 mr-2 text-indigo-500" />
          Formulação Centrada em Problemas
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Esta visão reflete a arquitetura v8, onde o Problema Clínico é o núcleo (Aggregate Root) da formulação, integrando avaliação, asserções e plano.
        </p>
      </div>

      {problemsList.map(problem => (
        <div key={problem.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center mb-1">
                <Target className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                {problem.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{problem.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${getPriorityColor(problem.assessment.clinicalPriority)}`}>
              Prioridade {problem.assessment.clinicalPriority}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Assessment (Reasoning Engine) */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center uppercase tracking-wider">
                <Activity className="w-4 h-4 mr-2 text-blue-500" /> Avaliação & Asserções
              </h4>

              <div className="flex space-x-2 mb-4">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-600 dark:text-slate-400">
                  Intensidade: <strong className="uppercase">{problem.assessment.intensity}</strong>
                </span>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-600 dark:text-slate-400">
                  Curso: <strong className="uppercase">{problem.assessment.course}</strong>
                </span>
              </div>

              {problem.assessment.hypotheses.length > 0 && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-lg">
                  <h5 className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center">
                    <Lightbulb className="w-3 h-3 mr-1" /> Hipóteses Conectadas (Diferencial)
                  </h5>
                  <ul className="list-disc pl-4 space-y-1">
                    {problem.assessment.hypotheses.map((h, i) => (
                      <li key={i} className="text-sm text-purple-900 dark:text-purple-300 font-medium">{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rede Epistêmica</h5>
                {problem.assessment.assertionIds.map(assertId => {
                  const assertion = formulation.assertions[assertId];
                  if (!assertion) return null;
                  return (
                    <ClinicalAssertionCard 
                      key={assertId} 
                      assertion={assertion} 
                      facts={formulation.facts} 
                      observations={formulation.observations} 
                    />
                  );
                })}
              </div>
            </div>

            {/* Right Column: Intervention (Planning Engine) */}
            <div className="border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 pt-4 lg:pt-0 lg:pl-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center uppercase tracking-wider">
                <ListTodo className="w-4 h-4 mr-2 text-emerald-500" /> Intervenção & Metas
              </h4>

              {problem.intervention.structuredPlan.map((plan, i) => (
                <div key={i} className="mb-4 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-3">
                  <div className="mb-2 pb-2 border-b border-emerald-200 dark:border-emerald-800/50">
                     <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500 block mb-1">Objetivo Clínico</span>
                     <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{plan.objective}</p>
                  </div>
                  
                  <div className="mb-2">
                     <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500 block mb-1">Técnica Recomendada</span>
                     <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{plan.technique}</p>
                     <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-1">"{plan.justification}"</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-800/30 flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-1">Meta</span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{plan.goal}</p>
                    </div>
                    <div className="flex-1 ml-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-1">Indicador</span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-slate-400" /> {plan.indicator}
                      </p>
                    </div>
                  </div>

                  {plan.supportingLiteratureIds.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-800/30">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Baseado em Evidências</span>
                      {plan.supportingLiteratureIds.map(litId => {
                        const lit = formulation.literature[litId];
                        return lit ? <p key={litId} className="text-xs text-slate-600 dark:text-slate-400 italic">{lit.title}</p> : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              {problem.intervention.structuredPlan.length === 0 && (
                <p className="text-sm text-slate-500 italic flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Nenhum plano estruturado para este problema.
                </p>
              )}
            </div>

          </div>
        </div>
      ))}
      
      {problemsList.length === 0 && (
        <div className="p-8 text-center text-slate-500 italic">
          Nenhum problema mapeado na formulação atual.
        </div>
      )}
    </div>
  );
};
