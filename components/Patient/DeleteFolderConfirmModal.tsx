import React from 'react';
import Button from '../Button';
import { ShieldCheckIcon, AlertTriangleIcon } from '../Icons'; // Assuming AlertTriangle exists or use generic
import { Folder, Patient } from '@/types';

interface DeleteFolderConfirmModalProps {
    isOpen: boolean;
    folder: Folder | null;
    affectedPatients: Patient[];
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteFolderConfirmModal: React.FC<DeleteFolderConfirmModalProps> = ({
    isOpen,
    folder,
    affectedPatients,
    onClose,
    onConfirm
}) => {
    if (!isOpen || !folder) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

                <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-surface rounded-[28px] text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className=" bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-on-surface " id="modal-title">
                                    Excluir Pasta "{folder.name}"?
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-foreground-muted ">
                                        Tem certeza que deseja excluir esta pasta?
                                    </p>

                                    {affectedPatients.length > 0 ? (
                                        <div className="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100/60 dark:border-red-800">
                                            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Impacto:</p>
                                            <ul className="list-disc pl-5 text-xs text-red-700 dark:text-red-300 max-h-32 overflow-y-auto">
                                                {affectedPatients.map(p => (
                                                    <li key={p.id}>
                                                        {p.name} <span className="opacity-75">- será removido deste grupo.</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-2 text-xs text-red-600 dark:text-red-400 italic">
                                                * Eles continuarão salvos no sistema e em outras pastas.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm text-foreground-muted ">Esta pasta está vazia.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className=" bg-surface dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button variant="danger" onClick={onConfirm} className="w-full sm:w-auto sm:ml-3">
                            Confirmar Exclusão
                        </Button>
                        <Button variant="secondary" onClick={onClose} className="mt-3 w-full sm:w-auto sm:mt-0">
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteFolderConfirmModal;
