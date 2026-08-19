
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import type { InterventionFeedback } from '@/types.ts';
import { FEEDBACK_EFFECTIVENESS } from '@/types.ts';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';

interface FeedbackEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (feedback: InterventionFeedback) => void;
    initialFeedback: InterventionFeedback | null;
}

const effectivenessLabels: Record<typeof FEEDBACK_EFFECTIVENESS[number], string> = {
    effective: 'Efetiva',
    partially_effective: 'Parcialmente Efetiva',
    ineffective: 'Inefetiva',
};

const FeedbackEditorModal: React.FC<FeedbackEditorModalProps> = ({ isOpen, onClose, onSave, initialFeedback }) => {
    const [effectiveness, setEffectiveness] = useState<InterventionFeedback['effectiveness']>('partially_effective');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEffectiveness(initialFeedback?.effectiveness || 'partially_effective');
            setNotes(initialFeedback?.notes || '');
            setError(null);
        }
    }, [isOpen, initialFeedback]);

    // Verifica se há mudanças não salvas
    const hasUnsavedChanges = useMemo(() => {
        if (!isOpen) return false;
        const initialNotes = initialFeedback?.notes || '';
        const initialEffectiveness = initialFeedback?.effectiveness || 'partially_effective';

        return notes !== initialNotes || effectiveness !== initialEffectiveness;
    }, [isOpen, notes, effectiveness, initialFeedback]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!notes.trim()) {
            setError("As notas de feedback são obrigatórias.");
            return;
        }
        onSave({ effectiveness, notes });
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleCloseAttempt} title="Feedback do Paciente sobre a Intervenção">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted ">Efetividade da Técnica</label>
                        <fieldset className="mt-2">
                            <legend className="sr-only">Selecione a efetividade</legend>
                            <div className="space-y-2">
                                {FEEDBACK_EFFECTIVENESS.map((option) => (
                                    <div key={option} className="flex items-center">
                                        <input
                                            id={option}
                                            name="effectiveness"
                                            type="radio"
                                            value={option}
                                            checked={effectiveness === option}
                                            onChange={() => setEffectiveness(option)}
                                            className="h-4 w-4 border-border text-foreground-muted focus:ring-slate-500"
                                        />
                                        <label htmlFor={option} className="ml-3 block text-sm font-medium text-foreground-muted ">
                                            {effectivenessLabels[option]}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    <div>
                        <label htmlFor="feedback-notes" className="block text-sm font-medium text-foreground-muted ">
                            Anotações do Feedback (perspectiva do paciente) *
                        </label>
                        <textarea
                            id="feedback-notes"
                            rows={4}
                            value={notes}
                            onChange={(e) => {
                                setNotes(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`mt-1 block w-full rounded-xl border px-3.5 py-2.5 sm:text-sm transition-all duration-200 ${error ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : ' border-border    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
                            placeholder="Ex: 'O paciente relatou que a técnica de respiração ajudou a reduzir a ansiedade em 70% durante a crise...'"
                        />
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseAttempt}>Cancelar</Button>
                        <Button type="submit">Salvar Feedback</Button>
                    </div>
                </form>
            </Modal>

            {showExitConfirmation && (
                <DeleteConfirmationModal
                    isOpen={showExitConfirmation}
                    onClose={() => setShowExitConfirmation(false)}
                    onConfirm={handleConfirmClose}
                    title="Descartar Feedback?"
                    message="Você digitou informações que não foram salvas. Deseja sair e descartá-las?"
                    confirmLabel="Sim, descartar"
                    cancelLabel="Continuar Editando"
                    variant="danger"
                />
            )}
        </>
    );
};

export default FeedbackEditorModal;
