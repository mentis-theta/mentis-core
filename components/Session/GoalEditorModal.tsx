
import React, { useState, useMemo } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import type { Goal, Intervention, PatientTask, Patient, InterventionSuggestion, User } from '@/types.ts';
import { GOAL_STATUSES, INTERVENTION_STATUSES } from '@/types.ts';
import { SparklesIcon, TrashIcon } from '../Icons';
import { useGoalEditor } from '@/hooks/useGoalEditor.ts';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';

interface GoalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  goalToEdit?: Goal | null;
  patient: Patient | null;
  currentUser: User | null;
}

const statusLabels: Record<typeof GOAL_STATUSES[number], string> = {
  in_progress: 'Em Andamento',
  achieved: 'Alcançada',
  paused: 'Em Pausa',
};

const interventionStatusLabels: Record<typeof INTERVENTION_STATUSES[number], string> = {
  planned: 'Planejada',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

const GoalEditorModal: React.FC<GoalEditorModalProps> = ({ isOpen, onClose, onSave, goalToEdit, patient, currentUser }) => {
  const { form, ai, setters, actions, isEditing } = useGoalEditor({ goalToEdit, patient, currentUser, onSave, isOpen });
  const { goalData } = form;

  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Verifica se houve alterações para evitar fechamento acidental
  const hasUnsavedChanges = useMemo(() => {
    if (!isOpen) return false;

    // Se estiver editando, compara JSON (simplificado para evitar complexidade de deep equal)
    if (isEditing && goalToEdit) {
      // Remove campos que podem mudar de ordem ou nulos vs undefined para comparação justa
      const cleanCurrent = JSON.stringify({ ...goalData, interventions: goalData.interventions.map(i => ({ ...i, feedback: null })), patientTasks: goalData.patientTasks });
      const cleanOriginal = JSON.stringify({ ...goalToEdit, interventions: goalToEdit.interventions.map(i => ({ ...i, feedback: null })), patientTasks: goalToEdit.patientTasks });
      return cleanCurrent !== cleanOriginal;
    }

    // Se for novo, verifica se digitou algo relevante
    return (
      goalData.title.trim() !== '' ||
      goalData.description.trim() !== '' ||
      goalData.interventions.length > 0 ||
      goalData.patientTasks.length > 0
    );
  }, [goalData, goalToEdit, isEditing, isOpen]);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowExitConfirmation(false);
    onClose();
  };

  const inputClass = "mt-1 block w-full rounded-xl border border-border bg-surface  dark:bg-slate-700  text-on-surface    px-3.5 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all duration-200";
  const labelClass = "block text-sm font-medium  text-foreground-muted   ";

  const renderEditorView = () => (
    <form onSubmit={actions.handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="goal-title" className={labelClass}>Título da Meta *</label>
          <input
            type="text"
            id="goal-title"
            value={goalData.title}
            onChange={(e) => actions.updateField('title', e.target.value)}
            className={`${inputClass} ${form.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
          {form.error && <p className="mt-1 text-sm text-red-600">{form.error}</p>}
        </div>
        <div>
          <label htmlFor="goal-status" className={labelClass}>Status</label>
          <select
            id="goal-status"
            value={goalData.status}
            onChange={(e) => actions.updateField('status', e.target.value as Goal['status'])}
            className={inputClass}
          >
            {GOAL_STATUSES.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="goal-description" className={labelClass}>Descrição</label>
        <textarea
          id="goal-description"
          value={goalData.description}
          onChange={(e) => actions.updateField('description', e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Descreva a meta de forma SMART (Específica, Mensurável, Atingível, Relevante, Temporal)..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interventions Section */}
        <div>
          <label className={`${labelClass} mb-2`}>Intervenções Clínicas</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={form.newInterventionText}
              onChange={e => setters.setNewInterventionText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); actions.addIntervention(); } }}
              placeholder="Adicionar intervenção"
              className={`flex-grow ${inputClass} mt-0`}
            />
            <Button type="button" variant="secondary" size="sm" onClick={actions.addIntervention}>Adicionar</Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={actions.handleSuggestInterventions} isLoading={ai.isSuggesting}>
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {ai.isSuggesting ? 'Sugerindo...' : 'Sugerir com IA'}
          </Button>

          <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
            {goalData.interventions.map(intervention => (
              <li key={intervention.id} className="flex items-center space-x-2 text-sm">
                <select
                  value={intervention.status}
                  onChange={e => actions.updateInterventionStatus(intervention.id, e.target.value as Intervention['status'])}
                  className="rounded border-border dark:bg-slate-700 text-xs py-0.5"
                >
                  {INTERVENTION_STATUSES.map(s => <option key={s} value={s}>{interventionStatusLabels[s]}</option>)}
                </select>
                <span className="flex-grow ">{intervention.text}</span>
                <button type="button" onClick={() => actions.removeIntervention(intervention.id)} className=" text-foreground-muted hover:text-red-600 dark:hover:text-red-400"><TrashIcon className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>

        {/* Patient Tasks Section */}
        <div>
          <label className={`${labelClass} mb-2`}>Tarefas do Paciente</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={form.newPatientTaskText}
              onChange={e => setters.setNewPatientTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); actions.addPatientTask(); } }}
              placeholder="Adicionar tarefa"
              className={`flex-grow ${inputClass} mt-0`}
            />
            <Button type="button" variant="secondary" size="sm" onClick={actions.addPatientTask}>Adicionar</Button>
          </div>

          <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
            {goalData.patientTasks.map(task => (
              <li key={task.id} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={e => actions.updatePatientTaskStatus(task.id, e.target.checked ? 'completed' : 'pending')}
                  className="h-4 w-4 rounded border-border dark:border-slate-500 text-foreground-muted focus:ring-slate-500 dark:bg-slate-700"
                />
                <span className={`flex-grow ${task.status === 'completed' ? 'line-through  text-foreground-muted   ' : ' '}`}>{task.text}</span>
                <button type="button" onClick={() => actions.removePatientTask(task.id)} className=" text-foreground-muted hover:text-red-600 dark:hover:text-red-400"><TrashIcon className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={handleCloseAttempt}>Cancelar</Button>
        <Button type="submit">{isEditing ? "Salvar Alterações" : "Salvar Meta"}</Button>
      </div>
    </form>
  );

  const renderSuggestionsView = () => {
    if (!ai.suggestedInterventions) return null;

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-on-surface ">Sugestões da IA</h4>
          <p className="text-sm text-foreground-muted ">Selecione as intervenções que deseja adicionar ao plano de tratamento.</p>
        </div>
        <div className="space-y-2 rounded-xl border border-border/60 p-3 max-h-60 overflow-y-auto">
          {ai.suggestedInterventions.suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-start">
              <input
                type="checkbox"
                id={`suggestion-${index}`}
                checked={ai.selectedSuggestions.includes(suggestion)}
                onChange={() => setters.toggleSuggestionSelection(suggestion)}
                className="h-4 w-4 rounded border-border dark:border-slate-500 text-foreground-muted focus:ring-slate-500 mt-1 dark:bg-slate-700"
              />
              <label htmlFor={`suggestion-${index}`} className="ml-2 text-sm text-foreground-muted ">{suggestion}</label>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-on-surface mt-4">Fontes Utilizadas pela IA</h4>
          <div className="mt-2 text-xs space-y-2 text-foreground-muted bg-surface dark:bg-slate-700/50 border border-border/60 rounded-xl p-3 max-h-28 overflow-y-auto">
            {ai.suggestedInterventions.sources.length > 0 ? (
              ai.suggestedInterventions.sources.map((source, index) => (
                <p key={index} title={source.content}>
                  <strong className="font-semibold">{source.source}:</strong> "{source.content.substring(0, 100)}..."
                </p>
              ))
            ) : (
              <p>Nenhuma fonte da base de conhecimento foi utilizada.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => setters.setView('editor')}>Voltar</Button>
          <Button type="button" onClick={actions.handleAddSelectedSuggestions}>
            Adicionar Selecionadas ({ai.selectedSuggestions.length})
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseAttempt} title={isEditing ? "Editar Meta de Tratamento" : (ai.view === 'editor' ? "Criar Nova Meta" : "Sugestões de Intervenção")}>
        {ai.view === 'editor' ? renderEditorView() : renderSuggestionsView()}
      </Modal>

      {showExitConfirmation && (
        <DeleteConfirmationModal
          isOpen={showExitConfirmation}
          onClose={() => setShowExitConfirmation(false)}
          onConfirm={handleConfirmClose}
          title="Descartar Alterações?"
          message="Você tem dados não salvos nesta meta. Se sair agora, todo o progresso será perdido."
          confirmLabel="Sim, descartar"
          cancelLabel="Continuar Editando"
          variant="danger"
        />
      )}
    </>
  );
};

export default GoalEditorModal;
