import React, { useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { LockClosedIcon, ExclamationIcon, UserCircleIcon, TrashIcon, ArrowLeftIcon } from '../../Icons';
import { ArrowRight, Archive } from 'lucide-react';

interface PatientLifecycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    onDischarge: (data: { closure_date: string; closure_reason: string; forwarding_notes: string }) => Promise<void>;
    onDelete: (hardDelete: boolean) => Promise<void>;
}

type LifecycleAction = 'select' | 'discharge' | 'delete';

export const PatientLifecycleModal: React.FC<PatientLifecycleModalProps> = ({ 
    isOpen, 
    onClose, 
    patientName,
    onDischarge,
    onDelete
}) => {
    const [activeAction, setActiveAction] = useState<LifecycleAction>('select');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Discharge Form State
    const [closureDate, setClosureDate] = useState(new Date().toISOString().split('T')[0]);
    const [closureReason, setClosureReason] = useState('');
    const [forwardingNotes, setForwardingNotes] = useState('');

    // Delete Form State
    const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
    const [confirmCheckbox1, setConfirmCheckbox1] = useState(false);
    const [confirmCheckbox2, setConfirmCheckbox2] = useState(false);

    // Reset state when opening/closing
    React.useEffect(() => {
        if (isOpen) {
            setActiveAction('select');
            setClosureDate(new Date().toISOString().split('T')[0]);
            setClosureReason('');
            setForwardingNotes('');
            setDeleteType('soft');
            setConfirmCheckbox1(false);
            setConfirmCheckbox2(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleDischargeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!closureDate || !closureReason) return;
        try {
            setIsSubmitting(true);
            await onDischarge({
                closure_date: new Date(closureDate).toISOString(),
                closure_reason: closureReason,
                forwarding_notes: forwardingNotes
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmCheckbox1 || (deleteType === 'hard' && !confirmCheckbox2)) return;
        try {
            setIsSubmitting(true);
            await onDelete(deleteType === 'hard');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderSelectionCards = () => (
        <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">
                O que você deseja fazer com o prontuário de {patientName}?
            </h3>
            
            <button 
                onClick={() => setActiveAction('discharge')}
                className="w-full text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group flex items-start gap-4"
            >
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <LockClosedIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Encerrar Caso Clínico (Alta)</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Sela o prontuário eletrônico. Bloqueia a edição de sessões e adição de novos dados para garantir a integridade forense do documento.
                    </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 mt-3 transition-colors" />
            </button>

            <button 
                onClick={() => setActiveAction('delete')}
                className="w-full text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all group flex items-start gap-4"
            >
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <TrashIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Excluir ou Arquivar</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Apaga ou oculta definitivamente os registros. Sujeito a restrições legais e responsabilidade de guarda de documentos do CFP.
                    </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-red-500 mt-3 transition-colors" />
            </button>
        </div>
    );

    const renderDischargeForm = () => (
        <>
            <div className="px-6 pt-4 pb-2 border-b border-border flex items-center gap-3">
                <button onClick={() => setActiveAction('select')} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Alta Clínica</h3>
            </div>
            <div className="p-6">
                <div className="flex items-start gap-4 mb-6 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex-shrink-0 mt-0.5">
                        <ExclamationIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Atenção: Ação Irreversível</h4>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-400/80">
                            Ao encerrar o caso de <strong>{patientName}</strong>, o prontuário eletrônico será selado para garantir a integridade forense. A edição será bloqueada permanentemente.
                        </p>
                    </div>
                </div>
                <form id="discharge-form" onSubmit={handleDischargeSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1.5">Data de Encerramento *</label>
                        <input type="date" required value={closureDate} onChange={(e) => setClosureDate(e.target.value)} className="block w-full rounded-xl border-border bg-surface-container-low text-on-surface shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1.5">Motivo do Encerramento *</label>
                        <select required value={closureReason} onChange={(e) => setClosureReason(e.target.value)} className="block w-full rounded-xl border-border bg-surface-container-low text-on-surface shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all">
                            <option value="">Selecione o motivo...</option>
                            <option value="alta_clinica">Alta Clínica</option>
                            <option value="abandono">Abandono de Tratamento</option>
                            <option value="encaminhamento">Encaminhamento Externo</option>
                            <option value="obito">Óbito</option>
                            <option value="outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1.5">Notas de Encaminhamento / Síntese Final</label>
                        <textarea rows={4} value={forwardingNotes} onChange={(e) => setForwardingNotes(e.target.value)} placeholder="Registre aqui a síntese final do caso ou os detalhes do encaminhamento realizado..." className="block w-full rounded-xl border-border bg-surface-container-low text-on-surface shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all resize-none" />
                    </div>
                </form>
            </div>
            <div className="border-t border-border bg-surface-container-lowest px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="ghost" onClick={() => setActiveAction('select')} disabled={isSubmitting}>Voltar</Button>
                <Button type="submit" form="discharge-form" className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-xl" disabled={isSubmitting || !closureReason}>
                    <LockClosedIcon className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Selando Prontuário...' : 'Selar Prontuário'}
                </Button>
            </div>
        </>
    );

    const renderDeleteForm = () => (
        <>
            <div className="px-6 pt-4 pb-2 border-b border-border flex items-center gap-3">
                <button onClick={() => setActiveAction('select')} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Excluir ou Arquivar</h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="flex items-start gap-4 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <div className="flex-shrink-0 mt-0.5">
                        <ExclamationIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Responsabilidade Legal (CFP)</h4>
                        <p className="mt-1 text-[13px] text-amber-800 dark:text-amber-400/90 leading-relaxed">
                            O Conselho Federal de Psicologia exige a guarda do registro documental clínico por no mínimo <strong>5 anos</strong> (podendo chegar a 20 anos em algumas áreas da saúde). A exclusão total (Hard-Delete) de um paciente real configura infração ética, devendo ser usada estritamente para erros de cadastro.
                        </p>
                    </div>
                </div>

                <form id="delete-form" onSubmit={handleDeleteSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${deleteType === 'soft' ? 'border-slate-800 bg-slate-50 dark:border-slate-400' : 'border-border'}`}>
                            <input type="radio" name="deleteType" value="soft" checked={deleteType === 'soft'} onChange={() => setDeleteType('soft')} className="mt-1 w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300" />
                            <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Archive className="w-4 h-4" /> Arquivar (Soft-Delete)
                                </span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">Oculta o paciente das listas e relatórios, mas preserva os dados no banco para fins de auditoria e conformidade legal.</span>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-red-50 dark:hover:bg-red-900/20 ${deleteType === 'hard' ? 'border-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-500' : 'border-border'}`}>
                            <input type="radio" name="deleteType" value="hard" checked={deleteType === 'hard'} onChange={() => setDeleteType('hard')} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-600 border-slate-300" />
                            <div>
                                <span className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                    <TrashIcon className="w-4 h-4" /> Excluir Definitivamente (Hard-Delete)
                                </span>
                                <span className="block text-xs text-red-600/80 dark:text-red-400/80 mt-1">Apaga permanentemente todos os registros (sessões, documentos, notas) do banco de dados. Irreversível.</span>
                            </div>
                        </label>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={confirmCheckbox1} onChange={(e) => setConfirmCheckbox1(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Confirmo que desejo prosseguir com esta ação para o paciente <strong>{patientName}</strong>.</span>
                        </label>
                        
                        {deleteType === 'hard' && (
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={confirmCheckbox2} onChange={(e) => setConfirmCheckbox2(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300" />
                                <span className="text-sm font-bold text-red-700 dark:text-red-400">Tenho ciência de que apagarei todos os registros clínicos de forma IRREVERSÍVEL.</span>
                            </label>
                        )}
                    </div>
                </form>
            </div>
            <div className="border-t border-border bg-surface-container-lowest px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="ghost" onClick={() => setActiveAction('select')} disabled={isSubmitting}>Voltar</Button>
                <Button type="submit" form="delete-form" className="!bg-red-600 hover:!bg-red-700 !text-white !rounded-xl" disabled={isSubmitting || !confirmCheckbox1 || (deleteType === 'hard' && !confirmCheckbox2)}>
                    {isSubmitting ? 'Processando...' : 'Confirmar Execução'}
                </Button>
            </div>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Ciclo de Vida" size="lg">
            <div className="min-w-[500px]">
                {activeAction === 'select' && renderSelectionCards()}
                {activeAction === 'discharge' && renderDischargeForm()}
                {activeAction === 'delete' ? renderDeleteForm() : null}
            </div>
        </Modal>
    );
};
