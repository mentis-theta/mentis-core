import React, { useState, useEffect } from 'react';
import { useColors, ColorName, StatusColorSettings, AVAILABLE_COLORS } from './ColorContext';
import Button from '../Button';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import { CommunicationSettings } from './sections/CommunicationSettings';
import { BrandingSettings } from './sections/BrandingSettings';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

const STATUS_LABELS: Record<keyof StatusColorSettings, string> = {
    scheduled: 'Agendado',
    completed: 'Realizada',
    canceled: 'Cancelada',
    missed: 'Falta',
    active: 'Paciente Ativo',
    inactive: 'Paciente Inativo',
    archived: 'Paciente Arquivado',
    discharged: 'Paciente com Alta'
};

export const OrganizationSettings: React.FC = () => {
    const { colors, updateColor, resetDefaults, getColorClasses } = useColors();
    const { currentUser, refreshUsers } = useAuth();
 const { addToast } = useToast();
    const confirm = useConfirm();

    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [monthlyGoal, setMonthlyGoal] = useState<number>(10000);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser?.expenseCategories) {
            setCategories(currentUser.expenseCategories);
        } else {
            // Defaults if none exist
            setCategories(['Aluguel', 'Marketing', 'Software', 'Impostos', 'Material de Escritório', 'Outros']);
        }

        if (currentUser?.monthly_goal) {
            setMonthlyGoal(currentUser.monthly_goal);
        }
    }, [currentUser]);

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const handleSaveFinancialSettings = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await updateProfile(currentUser.id, {
                expenseCategories: categories,
                monthly_goal: monthlyGoal
            });
            await refreshUsers();
 addToast('Configurações financeiras salvas!', 'success');
        } catch (error) {
 console.error(error);
 addToast('Erro ao salvar.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-surface-container-lowest border border-border/40 rounded-[24px] p-6 shadow-sm transition-all duration-300">

            {/* Branding Section */}
            <div className="mb-7">
                <h2 className="text-[15px] font-black text-foreground uppercase tracking-tight mb-4">
                    Identidade Visual
                </h2>
                <BrandingSettings />
            </div>

            <div className="mb-8 border-b border-t border-border/40 py-6">
                <h2 className="text-[14px] font-black text-foreground uppercase tracking-tight mb-1.5">
                    Cores e Legenda (Status)
                </h2>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-60">
                    Personalize as cores para cada status de agendamento e paciente
                </p>
            </div>

            <div className="space-y-6">
                {(Object.keys(STATUS_LABELS) as Array<keyof StatusColorSettings>).map((status) => (
                    <div key={status} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <div>
                            <label htmlFor={`status-color-${status}`} className="block text-sm font-medium text-foreground-muted ">
                                {STATUS_LABELS[status]}
                            </label>
                            <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${getColorClasses(colors[status], 'soft')}`}>
                                Visualização
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <select
                                id={`status-color-${status}`}
                                value={colors[status]}
                                onChange={(e) => updateColor(status, e.target.value as ColorName)}
                                className="block w-40 rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-surface dark:bg-slate-700 "
                            >
                                {AVAILABLE_COLORS.map(c => (
                                    <option key={c.name} value={c.name}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <div
                                className="h-8 w-8 rounded-full border border-border shadow-sm transition-colors"
                                style={{ backgroundColor: AVAILABLE_COLORS.find(c => c.name === colors[status])?.hex }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-4 border-t border-border flex justify-end">
                <Button
                    variant="ghost"
                    onClick={resetDefaults}
                    className=" text-foreground-muted hover:text-red-600 dark:hover:text-red-400"
                >
                    Restaurar Cores Padrão
                </Button>
            </div>

            {/* Expense Categories Section */}
            <div className="mt-8 pt-8 border-t border-border/40">
                <div className="mb-6">
                    <h2 className="text-[14px] font-black text-foreground uppercase tracking-tight mb-1.5">
                        Configurações Financeiras
                    </h2>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest opacity-60">
                        Defina suas metas e categorias de despesas
                    </p>
                </div>

                {/* Monthly Goal Input */}
                <div className="mb-6">
                    <label htmlFor="monthlyGoal" className="block text-sm font-medium text-foreground-muted mb-1">
                        Meta de Faturamento Mensal (R$)
                    </label>
                    <div className="relative rounded-md shadow-sm max-w-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className=" text-foreground-muted sm:text-sm">R$</span>
                        </div>
                        <input
                            id="monthlyGoal"
                            type="number"
                            value={monthlyGoal}
                            onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                            className="block w-full rounded-md border-border pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-surface dark:bg-slate-700 "
                            placeholder="10000"
                        />
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted ">Valor usado para calcular o progresso no dashboard.</p>
                </div>

                <div className="mb-4 pt-4 border-t border-border ">
                    <h4 className="text-sm font-medium text-on-surface mb-2">
                        Categorias de Despesas
                    </h4>
                </div>

                <div className="space-y-3">
                    {categories.map((cat, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                aria-label={`Nome da categoria ${cat}`}
                                value={cat}
                                onChange={(e) => {
                                    const newCats = [...categories];
                                    newCats[index] = e.target.value;
                                    setCategories(newCats);
                                }}
                                className="flex-1 rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-surface dark:bg-slate-700 "
                            />
                            <button
                                aria-label={`Excluir categoria ${cat}`}
                                onClick={async () => {
                                    const isConfirmed = await confirm({
                                        title: "Excluir Categoria",
                                        message: "Tem certeza que deseja excluir esta categoria?",
                                        confirmText: "Excluir"
                                    });
                                    if (isConfirmed) {
                                        setCategories(categories.filter((_, i) => i !== index));
                                    }
                                }}
                                className="p-2 text-foreground-muted hover:text-red-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            aria-label="Nome da nova categoria"
                            placeholder="Nova Categoria..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddCategory();
                            }}
                            className="flex-1 rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-surface dark:bg-slate-700 "
                        />
                        <Button onClick={handleAddCategory} size="sm" disabled={!newCategory.trim()}>
                            Adicionar
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button
                        onClick={handleSaveFinancialSettings}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            {/* Communication Templates Section (Refactored) */}
            <CommunicationSettings />
        </div>
    );
};
