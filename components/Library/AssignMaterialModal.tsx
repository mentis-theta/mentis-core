import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { usePatientContext } from '@/contexts/PatientContext';
import { usePatientMaterials } from '@/hooks/usePatientMaterials';
import Button from '../Button';
import { LibraryItem } from '@/types';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface AssignMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    libraryItem: LibraryItem | null;
}

const AssignMaterialModal: React.FC<AssignMaterialModalProps> = ({ isOpen, onClose, libraryItem }) => {
    const { patients } = usePatientContext();
    const { assignMaterial } = usePatientMaterials();
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen || !libraryItem) return null;

    // Filter active patients only
    const activePatients = patients.filter(p => p.is_active !== false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId) return;

        setIsSubmitting(true);
        try {
            const success = await assignMaterial(libraryItem, selectedPatientId);
            if (success) {
                setIsSuccess(true);
                setTimeout(() => {
                    setIsSuccess(false);
                    onClose();
                    setSelectedPatientId('');
                }, 2000);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enviar ao Paciente" size="lg">
            <div className="p-6 overflow-y-auto max-h-[85vh]">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <h3 className="text-xl font-bold text-on-surface">Material Enviado!</h3>
                        <p className="text-foreground-muted text-center max-w-sm">
                            O material já está disponível no Portal do Paciente.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Preview do Item */}
                        <div className="bg-surface-container-low border border-border/50 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Material a ser enviado:</h4>
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-on-surface text-lg">{libraryItem.title}</span>
                                {libraryItem.description && (
                                    <span className="text-sm text-foreground-muted line-clamp-3">{libraryItem.description}</span>
                                )}
                            </div>
                        </div>

                        {/* Aviso de Segurança (Exigência do Zelador de Segurança) */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-amber-700 dark:text-amber-500 text-sm">Aviso de Bypass Criptográfico (E2EE)</span>
                                <p className="text-sm text-amber-800/80 dark:text-amber-400/80">
                                    A sua Biblioteca Pessoal possui Criptografia Ponta-a-Ponta Absoluta. No entanto, para que o paciente consiga acessar este conteúdo no portal web através de uma senha comum, <strong>uma cópia descriptografada do título, descrição e link</strong> deste material ficará armazenada no servidor. O acesso será bloqueado rigidamente via Banco de Dados (Row Level Security) apenas para o paciente de destino, mas não contará com o selo E2E.
                                </p>
                            </div>
                        </div>

                        {/* Seleção do Paciente */}
                        <div>
                            <label className="block text-sm font-bold text-on-surface mb-2">Selecione o Paciente</label>
                            <select
                                required
                                value={selectedPatientId}
                                onChange={e => setSelectedPatientId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            >
                                <option value="" disabled>Escolha um paciente...</option>
                                {activePatients.map(patient => (
                                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !selectedPatientId}>
                                {isSubmitting ? 'Enviando...' : 'Confirmar Envio'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default AssignMaterialModal;
