
import React, { useState, useEffect } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import type { User } from '@/types.ts';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';
import { useToast } from '@/contexts/ToastContext';

interface TransferPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (newPsychologistId: string) => void;
    psychologists: User[];
    currentPsychologistId?: string;
}

const TransferPatientModal: React.FC<TransferPatientModalProps> = ({ isOpen, onClose, onTransfer, psychologists, currentPsychologistId }) => {
    const [selectedId, setSelectedId] = useState('');
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
 const { addToast } = useToast();

    // Reset state when modal is opened/closed
    useEffect(() => {
        if (isOpen) {
            setSelectedId('');
        }
    }, [isOpen]);

    const availablePsychologists = psychologists.filter(p => p.id !== currentPsychologistId);

    const handleCloseAttempt = () => {
        if (selectedId) {
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
        if (!selectedId) {
 addToast("Por favor, selecione um psicólogo.", "warning");
            return;
        }
        onTransfer(selectedId);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleCloseAttempt} title="Transferir Paciente">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="psychologist-select" className="block text-sm font-medium text-foreground-muted ">
                            Selecione o novo psicólogo responsável
                        </label>
                        <select
                            id="psychologist-select"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface px-3.5 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                            required
                        >
                            <option value="" disabled>Selecione um profissional...</option>
                            {availablePsychologists.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.crp})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseAttempt}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Confirmar Transferência
                        </Button>
                    </div>
                </form>
            </Modal>

            {showExitConfirmation && (
                <DeleteConfirmationModal
                    isOpen={showExitConfirmation}
                    onClose={() => setShowExitConfirmation(false)}
                    onConfirm={handleConfirmClose}
                    title="Cancelar Transferência?"
                    message="Você selecionou um profissional. Deseja sair sem transferir o paciente?"
                    confirmLabel="Sim, sair"
                    cancelLabel="Voltar"
                    variant="danger"
                />
            )}
        </>
    );
};

export default TransferPatientModal;
