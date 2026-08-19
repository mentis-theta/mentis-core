
import React, { useMemo, useState } from 'react';
import type { Patient, Goal, Intervention, PatientTask } from '@/types.ts';
import Button from '../Button.tsx';
import { PlusIcon, ClipboardListIcon, PencilIcon, TrashIcon, ChevronDownIcon, CheckCircleIcon, ClipboardCheckIcon, ChatBubbleLeftEllipsisIcon } from '../Icons';
import { formatDate } from '@/utils/formatters.ts';
import StatusBadge from '../StatusBadge.tsx';
import { LABELS, STATUS_COLORS, INTERVENTION_ICONS, EFFECTIVENESS_ICONS } from '@/utils/mappers.ts';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';

interface TreatmentPlanDashboardProps {
  patient: Patient;
  onAddGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenFeedbackEditor: (goalId: string, interventionId: string) => void;
  canEdit: boolean;
}

interface InterventionItemProps {
  intervention: Intervention;
  onOpenFeedbackEditor: () => void;
}

const InterventionItem: React.FC<InterventionItemProps> = ({ intervention, onOpenFeedbackEditor }) => {
  const Icon = INTERVENTION_ICONS[intervention.status];
  const label = LABELS.INTERVENTION_STATUS[intervention.status];

  // Custom logic for icon colors based on status (keeping it simple here or could map in mappers.ts)
  const iconColor = intervention.status === 'completed' ? 'text-green-600 dark:text-green-400' :
    intervention.status === 'in_progress' ? 'text-blue-500 dark:text-blue-400' : ' text-foreground-muted   ';

  const feedback = intervention.feedback;
  const EffectivenessIcon = feedback ? EFFECTIVENESS_ICONS[feedback.effectiveness] : null;

  return (
    <li className="flex items-start space-x-3 py-1.5">
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} aria-label={label} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className=" text-foreground-muted break-words flex-1 min-w-0">{intervention.text}</p>
          <button onClick={onOpenFeedbackEditor} className="flex-shrink-0 p-1 rounded-full text-foreground-muted hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-300 transition-colors" title="Registrar Feedback">
            <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
          </button>
        </div>
        {feedback && EffectivenessIcon && (
          <div className="flex items-start text-xs mt-1">
            <EffectivenessIcon className={`h-4 w-4 mr-1.5 ${STATUS_COLORS.EFFECTIVENESS[feedback.effectiveness]} flex-shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <span className={`font-medium ${STATUS_COLORS.EFFECTIVENESS[feedback.effectiveness]}`}>
                {LABELS.EFFECTIVENESS[feedback.effectiveness]}:
              </span>
              <span className="ml-1.5 text-foreground-muted italic break-words" title={feedback.notes}>
                "{feedback.notes}"
              </span>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

interface PatientTaskItemProps {
  task: PatientTask;
}

const PatientTaskItem: React.FC<PatientTaskItemProps> = ({ task }) => {
  const isCompleted = task.status === 'completed';
  return (
    <li className="flex items-start space-x-3 py-1">
      {isCompleted ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" /> : <ClipboardCheckIcon className="h-5 w-5 flex-shrink-0 text-foreground-muted " />}
      <span className={`flex-1  text-foreground-muted    break-words ${isCompleted ? 'line-through  text-foreground-muted   ' : ''}`}>{task.text}</span>
    </li>
  );
};

const TreatmentPlanDashboard: React.FC<TreatmentPlanDashboardProps> = ({ patient, onAddGoal, onEditGoal, onDeleteGoal, onOpenFeedbackEditor, canEdit }) => {
  const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'full_audit');
  const patientGoals = decoupledData?.goals || [];
  const patientSessions = decoupledData?.sessions || [];

  const sortedGoals = useMemo(() => {
    return [...patientGoals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [patientGoals]);

  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(sortedGoals[0]?.id || null);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-on-surface ">Plano de Tratamento</h3>
        {canEdit && (
          <Button onClick={onAddGoal}>
            <PlusIcon /> <span className="ml-2 hidden sm:inline">Adicionar Meta</span>
          </Button>
        )}
      </div>

      {isLoadingDecoupled ? (
        <div className="flex flex-col items-center justify-center p-12 h-64 bg-surface-container-lowest rounded-3xl border border-border/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-4 text-sm text-foreground-muted">Carregando plano de tratamento...</span>
        </div>
      ) : sortedGoals.length > 0 ? (
        <div className="space-y-4">
          {sortedGoals.map(goal => {
            const isExpanded = expandedGoalId === goal.id;
            return (
              <div key={goal.id} className="rounded-lg border border-border bg-surface shadow-sm overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                  className="w-full text-left p-4 flex justify-between items-center bg-surface/50 dark:bg-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-inset"
                  aria-expanded={isExpanded}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 min-w-0 mr-4">
                    <h4 className="font-semibold text-on-surface text-lg break-words min-w-0">{goal.title}</h4>
                    <div className="flex-shrink-0 mt-1 sm:mt-0">
                      <StatusBadge type="goal" value={goal.status} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {canEdit && (
                      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onEditGoal(goal)} className="p-1.5 rounded-full text-foreground-muted hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-600 dark:hover:text-slate-200 transition-colors" title="Editar meta">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDeleteGoal(goal.id)} className="p-1.5 rounded-full text-foreground-muted hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors" title="Excluir meta">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <ChevronDownIcon className={`h-5 w-5  text-foreground-muted    transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 space-y-6 border-t border-border ">
                    {goal.description && <p className=" text-foreground-muted whitespace-pre-wrap break-words">{goal.description}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <h5 className="font-semibold text-foreground-muted text-sm mb-2">Intervenções Clínicas</h5>
                        {goal.interventions && goal.interventions.length > 0 ? (
                          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                            {goal.interventions.map(int => <InterventionItem key={int.id} intervention={int} onOpenFeedbackEditor={() => onOpenFeedbackEditor(goal.id, int.id)} />)}
                          </ul>
                        ) : <p className="text-sm italic text-foreground-muted ">Nenhuma intervenção definida.</p>}
                      </div>
                      <div>
                        <h5 className="font-semibold text-foreground-muted text-sm mb-2">Tarefas do Paciente</h5>
                        {goal.patientTasks && goal.patientTasks.length > 0 ? (
                          <ul className="space-y-1">
                            {goal.patientTasks.map(task => <PatientTaskItem key={task.id} task={task} />)}
                          </ul>
                        ) : <p className="text-sm italic text-foreground-muted ">Nenhuma tarefa definida.</p>}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-foreground-muted text-sm mb-2">Sessões Vinculadas</h5>
                      {patientSessions.filter(s => s.goalIds.includes(goal.id)).length > 0 ? (
                        <ul className="space-y-1 text-sm text-foreground-muted list-disc list-inside">
                          {patientSessions
                            .filter(s => s.goalIds.includes(goal.id))
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5) // Show latest 5
                            .map(s => (
                              <li key={s.id}>Sessão de {formatDate(s.date)}</li>
                            ))
                          }
                        </ul>
                      ) : (
                        <p className="text-sm italic text-foreground-muted ">Nenhuma sessão vinculada a esta meta ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border-2 border-dashed border-border p-12 text-center">
          <ClipboardListIcon className="mx-auto h-12 w-12 text-foreground-muted " />
          <h4 className="mt-4 text-lg font-semibold text-foreground-muted ">Nenhuma meta definida</h4>
          <p className="mt-1 text-foreground-muted ">Clique em "Adicionar Meta" para criar a primeira para este paciente.</p>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanDashboard;
