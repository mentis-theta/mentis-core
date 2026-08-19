import React, { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { useReminders } from '@/hooks/useReminders';
import { usePatientContext } from '@/contexts/PatientContext';
import { Input, Textarea, Checkbox } from '../Form';
import type { Reminder } from '@/types';

interface AddReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const COLORS = [
    { id: 'yellow', bg: 'bg-amber-100', border: 'border-amber-300', label: 'Amarelo' },
    { id: 'red', bg: 'bg-red-100', border: 'border-red-300', label: 'Urgente' },
    { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', label: 'Azul' },
    { id: 'green', bg: 'bg-green-100', border: 'border-green-300', label: 'Verde' },
    { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', label: 'Roxo' },
];

export const AddReminderModal: React.FC<AddReminderModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { addReminder } = useReminders();
    const { patients } = usePatientContext();
    const [description, setDescription] = useState('');
    const [patientId, setPatientId] = useState('');
    const [color, setColor] = useState<Reminder['color']>('yellow');
    const [notifyEmail, setNotifyEmail] = useState(false);
    const [notifyPush, setNotifyPush] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setIsSubmitting(true);
        await addReminder({
            description,
            patient_id: patientId || undefined,
            color,
            notify_email: notifyEmail,
            notify_push: notifyPush
        });
        setIsSubmitting(false);
        onSuccess();
        onClose();
        // Reset
        setDescription('');
        setPatientId('');
        setColor('yellow');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Lembrete">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                    label="Descrição do Lembrete"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ligar para paciente, preparar relatório..."
                    required
                    rows={3}
                />

                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">Vincular Paciente (Opcional)</label>
                    <select
                        value={patientId}
                        onChange={e => setPatientId(e.target.value)}
                        className="block w-full rounded-xl border border-border px-3.5 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm bg-surface dark:bg-slate-700 text-on-surface transition-all duration-200"
                    >
                        <option value="">Nenhum</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">Cor do Lembrete</label>
                    <div className="flex space-x-3">
                        {COLORS.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setColor(c.id as Reminder['color'])}
                                className={`w-8 h-8 rounded-full ${c.bg} border-2 ${color === c.id ? `border-slate-600 scale-110` : 'border-transparent'} transition-all`}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex space-x-6">
                    <Checkbox
                        id="notifyEmail"
                        label="Email"
                        checked={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.checked)}
                    />
                    <Checkbox
                        id="notifyPush"
                        label="Push"
                        checked={notifyPush}
                        onChange={e => setNotifyPush(e.target.checked)}
                        disabled // Future feature
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Lembrete'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
