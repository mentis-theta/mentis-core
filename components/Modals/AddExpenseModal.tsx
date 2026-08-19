import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon } from '../Icons';
import Button from '../Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { Expense } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenseToEdit?: Expense | null; // Improved typing
    type?: 'income' | 'expense'; // New Prop
    onSuccess?: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, expenseToEdit, type = 'expense', onSuccess }) => {
    const { currentUser } = useAuth();
 const { addToast } = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(''); // New State
    const [isPaid, setIsPaid] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            // Check if it's a real edit (has ID) or a "Template" passed via expenseToEdit (no ID)
            if (expenseToEdit) {
                // Even if it's a template, we might want to use its type/category
                setDescription(expenseToEdit.description || '');
                // Only set amount if it's non-zero or if we are editing a real entry (maybe it was free?)
                // For template mode (id matches empty string check), strictly avoid 0.
                if (expenseToEdit.id) {
                    setAmount(expenseToEdit.amount.toString());
                } else {
                    setAmount('');
                }

                // ensure we handle timestamp or date string to YYYY-MM-DD
                const d = expenseToEdit.date || new Date().toISOString();
                setDate(d.includes('T') ? d.split('T')[0] : d);
                setCategory(expenseToEdit.category || '');
                setPaymentMethod(expenseToEdit.payment_method || ''); // Load existing
                setIsPaid(expenseToEdit.is_paid);
            } else {
                setDescription('');
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(type === 'income' ? 'Outros' : 'Geral'); // Default category based on type
                setPaymentMethod(''); // Reset
                setIsPaid(true);
            }
        }
    }, [isOpen, expenseToEdit, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSubmitting(true);

        const amountFloat = parseFloat(amount.toString().replace(',', '.')); // Simple sanitation

        const payload = {
            user_id: currentUser.id,
            description,
            amount: amountFloat,
            date,
            category,
            is_paid: isPaid,
            type: expenseToEdit?.type || type, // Use existing type if editing, or passed type
            payment_method: paymentMethod // New Field
        };

        let error;
        if (expenseToEdit && expenseToEdit.id) {
            const { error: updateError } = await supabase
                .from('expenses')
                .update(payload)
                .eq('id', expenseToEdit.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('expenses')
                .insert([payload]);
            error = insertError;
        }

        setIsSubmitting(false);

        if (error) {
 addToast('Erro ao salvar lançamento', 'error');
        } else {
 addToast('Lançamento salvo com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['financial_expenses', currentUser.id] });
            if (onSuccess) onSuccess();
            onClose();
        }
    };

    // UI Helpers
    const currentType = expenseToEdit?.type || type;
    const isIncome = currentType === 'income';
    const isEditing = !!(expenseToEdit && expenseToEdit.id); // Strict check for ID

    const title = isEditing ? 'Editar Lançamento' : (isIncome ? 'Adicionar Outra Receita' : 'Adicionar Despesa');

    if (!isOpen) return null;

    // Shared input styles
    const inputBase = "block w-full h-12 rounded-xl px-4  bg-surface  dark:bg-slate-700  text-on-surface     text-foreground-muted  outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent transition-all border border-border ";

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200" aria-hidden="true" />
                <div className="relative bg-surface rounded-[28px] max-w-md w-full mx-4 p-6 shadow-2xl animate-[fadeIn_200ms_ease-out]">
                    {/* Close */}
                    <button onClick={onClose} className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-full bg-background/60 dark:bg-slate-700/60 text-foreground-muted hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 transition-all duration-200">
                        <XIcon className="w-5 h-5" />
                    </button>

                    <Dialog.Title className="text-xl font-semibold text-on-surface mb-5">{title}</Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-foreground-muted mb-1">Descrição</label>
                            <input required type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputBase} placeholder="Ex: Supervisão clínica" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground-muted mb-1">Valor (R$)</label>
                            <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputBase} placeholder="0,00" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-foreground-muted mb-1">Data</label>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputBase} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-foreground-muted mb-1">
                                    {isIncome ? 'Origem' : 'Categoria'}
                                </label>
                                <input list="categories" type="text" value={category} onChange={e => setCategory(e.target.value)} className={inputBase} />
                                <datalist id="categories">
                                    {isIncome ? (
                                        <>
                                            <option value="Supervisão" />
                                            <option value="Curso/Palestra" />
                                            <option value="Outros" />
                                        </>
                                    ) : (
                                        <>
                                            <option value="Alguel" />
                                            <option value="Marketing" />
                                            <option value="Software" />
                                            <option value="Impostos" />
                                            <option value="Outros" />
                                        </>
                                    )}
                                </datalist>
                            </div>
                        </div>

                        {/* New Payment Method Field - Only for Income */}
                        {isIncome && (
                            <div>
                                <label className="block text-xs font-medium text-foreground-muted mb-1">Forma de Pagamento</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className={inputBase}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                                    <option value="Cartão de Débito">Cartão de Débito</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        )}

                        <div className="flex items-center mt-2">
                            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="rounded-lg border-border text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                            <label className="ml-2.5 block text-sm text-foreground-muted ">
                                {isPaid ? (isIncome ? 'Recebido' : 'Pago') : (isIncome ? 'Pendente de Recebimento' : 'Pendente de Pagamento')}
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border ">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium text-foreground-muted hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200">Cancelar</button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-sm transition-all duration-200 ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-950 hover:bg-indigo-900'} disabled:opacity-50`}
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Dialog>
    );
};
