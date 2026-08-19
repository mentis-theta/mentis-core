import React from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon, UserCircleIcon, ArrowUpIcon, ArrowDownIcon } from '../Icons';

interface SmartEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSession: () => void; // Route to Calendar/Add Session
    onAddExpense: () => void; // Route to existing logic
    onAddIncome: () => void; // New logic for manual income
}

export const SmartEntryModal: React.FC<SmartEntryModalProps> = ({ isOpen, onClose, onAddSession, onAddExpense, onAddIncome }) => {
    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200" aria-hidden="true" />

                <div className="relative bg-surface-container-lowest rounded-[28px] max-w-lg w-full mx-4 p-7 shadow-2xl border border-border/40 animate-[fadeIn_200ms_ease-out]">
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-low text-foreground-muted hover:text-on-surface transition-colors duration-200 outline-none cursor-pointer"
                        aria-label="Fechar"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>

                    <Dialog.Title className="text-xl font-bold text-on-surface font-sans mb-1.5 tracking-tight">
                        Novo Lançamento
                    </Dialog.Title>
                    <p className="text-foreground-muted text-sm font-sans mb-6 font-medium">
                        O que você gostaria de registrar?
                    </p>

                    <div className="flex flex-col gap-3">
                        {/* Option 1: Session Revenue */}
                        <button
                            onClick={() => { onClose(); onAddSession(); }}
                            className="w-full flex items-center p-4 rounded-2xl border border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 group cursor-pointer outline-none text-left"
                        >
                            <div className="h-12 w-12 flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl mr-4 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-semibold text-base text-on-surface font-sans truncate m-0">Receita de Atendimento</h3>
                                <p className="text-xs text-foreground-muted font-sans mt-0.5 truncate m-0">Sessão individual, casal ou grupo</p>
                            </div>
                        </button>

                        {/* Option 2: Other Income */}
                        <button
                            onClick={() => { onClose(); onAddIncome(); }}
                            className="w-full flex items-center p-4 rounded-2xl border border-border/40 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all duration-200 group cursor-pointer outline-none text-left"
                        >
                            <div className="h-12 w-12 flex items-center justify-center bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-2xl mr-4 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <ArrowUpIcon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-semibold text-base text-on-surface font-sans truncate m-0">Outra Receita</h3>
                                <p className="text-xs text-foreground-muted font-sans mt-0.5 truncate m-0">Venda de curso, supervisão, extra</p>
                            </div>
                        </button>

                        {/* Option 3: Expense */}
                        <button
                            onClick={() => { onClose(); onAddExpense(); }}
                            className="w-full flex items-center p-4 rounded-2xl border border-border/40 hover:border-pink-500/30 hover:bg-pink-500/5 transition-all duration-200 group cursor-pointer outline-none text-left"
                        >
                            <div className="h-12 w-12 flex items-center justify-center bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-2xl mr-4 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <ArrowDownIcon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-semibold text-base text-on-surface font-sans truncate m-0">Despesa</h3>
                                <p className="text-xs text-foreground-muted font-sans mt-0.5 truncate m-0">Aluguel, marketing, software</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};
