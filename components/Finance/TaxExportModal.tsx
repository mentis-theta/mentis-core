import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XIcon, DocumentTextIcon, CheckCircleIcon } from '@/components/Icons';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateTaxExport, TaxDbData } from '@/utils/taxExportUtils';
import { Patient } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface TaxExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRegime: 'pf' | 'pj';
    dbData: TaxDbData;
    patients: Patient[];
    currentMonthDate: Date;
}

export const TaxExportModal: React.FC<TaxExportModalProps> = ({ isOpen, onClose, defaultRegime, dbData, patients, currentMonthDate }) => {
    const [selectedRegime, setSelectedRegime] = useState<'pf' | 'pj'>(defaultRegime);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const { addToast } = useToast();

    // Generate last 12 months for selection
    const availableMonths = Array.from({ length: 12 }).map((_, i) => {
        const d = subMonths(currentMonthDate, i);
        return {
            key: format(d, 'yyyy-MM'),
            label: format(d, 'MMM/yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
        };
    });

    useEffect(() => {
        if (isOpen) {
            setSelectedRegime(defaultRegime);
            setSelectedMonths([format(currentMonthDate, 'yyyy-MM')]);
        }
    }, [isOpen, defaultRegime, currentMonthDate]);

    const toggleMonth = (key: string) => {
        setSelectedMonths(prev => 
            prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
        );
    };

    const handleExport = () => {
        if (selectedMonths.length === 0) {
            addToast('Selecione pelo menos um mês.', 'warning');
            return;
        }

        const result = generateTaxExport(selectedMonths, dbData, patients, selectedRegime);

        if (result.success) {
            if (result.missingCpfCount > 0) {
                addToast(`Exportação concluída. Atenção: ${result.missingCpfCount} pagamentos estão sem CPF. Corrija nos cadastros para evitar malha fina.`, 'warning');
            } else {
                addToast(`Lote Fiscal (${selectedRegime.toUpperCase()}) exportado com sucesso!`, 'success');
            }
            onClose();
        } else {
            addToast(result.error || 'Erro ao exportar dados fiscais.', 'error');
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full bg-surface-container-lowest rounded-3xl shadow-2xl border border-white/10 overflow-hidden text-on-surface">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-white/5 bg-surface-container flex justify-between items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="h-10 w-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center backdrop-blur-md border border-primary/20">
                                <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-bold m-0 tracking-tight text-on-surface">
                                    Exportação Fiscal Avançada
                                </Dialog.Title>
                                <p className="text-xs text-foreground-muted m-0">Lote Consolidado de Múltiplos Meses</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-foreground-muted transition-colors relative z-10 outline-none">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* 1. Regime Fiscal (Toggle) */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">1. Formato do Relatório</h4>
                            <div className="flex bg-surface-container-low p-1 rounded-2xl border border-border/40 relative">
                                <button
                                    onClick={() => setSelectedRegime('pf')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 outline-none ${selectedRegime === 'pf' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-foreground-muted hover:text-on-surface'}`}
                                >
                                    Pessoa Física (Carnê-Leão)
                                </button>
                                <button
                                    onClick={() => setSelectedRegime('pj')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 outline-none ${selectedRegime === 'pj' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-foreground-muted hover:text-on-surface'}`}
                                >
                                    Pessoa Jurídica (DMED)
                                </button>
                            </div>
                        </div>

                        {/* 2. Seleção de Meses (Chips) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">2. Meses a Exportar</h4>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                    {selectedMonths.length} selecionado(s)
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {availableMonths.map((m) => {
                                    const isSelected = selectedMonths.includes(m.key);
                                    return (
                                        <button
                                            key={m.key}
                                            onClick={() => toggleMonth(m.key)}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 outline-none ${isSelected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border/40 text-foreground hover:border-primary/30'}`}
                                        >
                                            {m.label}
                                            {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-surface-container-low border-t border-border/40 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-foreground hover:bg-surface-container transition-colors outline-none">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleExport}
                            disabled={selectedMonths.length === 0}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed outline-none flex items-center gap-2"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            Baixar CSV Consolidado
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
