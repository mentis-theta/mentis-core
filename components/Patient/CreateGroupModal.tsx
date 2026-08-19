import React, { useState } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import { Input } from '../Form.tsx';
import { useColors, type ColorName, AVAILABLE_COLORS } from '../Settings/ColorContext.tsx';
import { CheckIcon } from '../Icons';
import type { Patient } from '@/types.ts';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, color: string, selectedIds: string[]) => Promise<void>;
    initialName?: string;
    preSelectedIds?: string[];
    patients: Patient[];
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSave, initialName = '', preSelectedIds = [], patients }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState(initialName);
    const [color, setColor] = useState<ColorName>('blue');
    const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Gerenciamos o reset via key no pai ou manualmente no onClose, mas aqui protegemos contra re-renders indesejados
    const prevOpenRef = React.useRef(isOpen);
    React.useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            setStep(1);
            setName(initialName);
            setColor('blue');
            setLocalSelectedIds(new Set(preSelectedIds));
            setIsSubmitting(false);
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, initialName, preSelectedIds]);

    const handleNext = () => {
        if (!name.trim()) return;
        setStep(2);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(localSelectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setLocalSelectedIds(newSet);
    };

    const handleFinalSave = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await onSave(name, color.toString(), Array.from(localSelectedIds));
            // O onClose é chamado pelo Pai (PatientList) dentro do handleCreateGroup
        } catch (error) {
 console.error("Failed to create group", error);
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Grupo">
            <div className="space-y-4">
                {/* Step 1: Info Básica */}
                {step === 1 && (
                    <div className="space-y-4 animate-fadeIn">
                        <Input
                            label="Nome do Grupo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleNext();
                                }
                            }}
                            placeholder="Ex: TDAH, Terças-feiras, Grupo de Apoio..."
                            autoFocus
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-2">
                                Cor da Etiqueta
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {AVAILABLE_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => setColor(c.name)}
                                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${color === c.name ? 'ring-2 ring-offset-2 ring-slate-500' : ''}`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.label}
                                    >
                                        {color === c.name && <CheckIcon className="h-4 w-4 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Seleção de UI */}
                {step === 2 && (
                    <div className="space-y-3 animate-fadeIn">
                        <label className="block text-sm font-medium text-foreground-muted mb-2">
                            Pacientes no Grupo: <span className="font-bold text-primary">{localSelectedIds.size}</span>
                        </label>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 no-scrollbar border border-border/60 rounded-xl bg-surface-container-low/30">
                            {patients.length === 0 ? (
                                <p className="text-center text-sm text-foreground-muted py-4">Nenhum paciente ativo encontrado.</p>
                            ) : (
                                patients.filter(p => p.status === 'active' || p.is_active !== false).map(patient => (
                                    <div
                                        key={patient.id}
                                        onClick={() => toggleSelection(patient.id)}
                                        className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-colors border ${localSelectedIds.has(patient.id) ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-surface border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <div className={`mr-3 h-5 w-5 rounded flex items-center justify-center border transition-colors ${localSelectedIds.has(patient.id) ? 'bg-primary border-primary text-primary-foreground' : 'bg-surface border-slate-300 dark:border-slate-600'}`}>
                                            {localSelectedIds.has(patient.id) && <CheckIcon className="h-3 w-3" />}
                                        </div>

                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 flex-shrink-0">
                                            {patient.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="ml-3 flex-1 overflow-hidden">
                                            <p className={`text-sm font-medium truncate ${localSelectedIds.has(patient.id) ? 'text-primary' : 'text-on-surface'}`}>
                                                {patient.name}
                                            </p>
                                            <p className="text-[10px] text-foreground-muted tracking-widest">{patient.cpf || 'Sem CPF'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                    {step === 2 ? (
                        <Button variant="secondary" type="button" onClick={() => setStep(1)} disabled={isSubmitting}>
                            Voltar
                        </Button>
                    ) : (
                        <div></div> // Spacer para empurrar os botões pra direita
                    )}

                    <div className="flex space-x-2">
                        <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>

                        {step === 1 ? (
                            <Button variant="primary" type="button" onClick={handleNext} disabled={!name.trim()}>
                                Próximo
                            </Button>
                        ) : (
                            <Button variant="primary" type="button" onClick={handleFinalSave} disabled={isSubmitting}>
                                {isSubmitting ? 'Criando...' : 'Criar Grupo'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CreateGroupModal;
