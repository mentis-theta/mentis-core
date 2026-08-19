import React, { useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, WhatsappIcon, CurrencyDollarIcon } from '../Icons';
import { Debtor } from '@/hooks/useFinancialData';
import { formatCurrency } from '@/utils/formatters';
import { getWhatsAppLink } from '@/utils/whatsapp';

interface DebtorsListProps {
    debtors: Debtor[];
}

export const DebtorsList: React.FC<DebtorsListProps> = ({ debtors }) => {
    const [isOpen, setIsOpen] = useState(true); // Default to open for visibility on Finance page

    const totalPending = debtors.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 overflow-hidden flex flex-col transition-colors duration-200">
            {/* Cabeçalho Acordeão */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="p-6 flex justify-between items-center cursor-pointer hover:bg-surface-container-low transition-colors select-none group"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
                        <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-foreground-muted text-[10px] font-sans uppercase tracking-wider m-0">
                            Contas a Receber
                        </h4>
                        <p className="text-2xl font-bold tracking-tight text-pink-600 dark:text-pink-400 font-sans m-0">
                            {formatCurrency(totalPending)}
                        </p>
                    </div>
                </div>
                <div className="text-foreground-muted group-hover:text-on-surface transition-colors shrink-0">
                    {isOpen ? <ChevronDownIcon className="w-6 h-6" /> : <ChevronRightIcon className="w-6 h-6" />}
                </div>
            </div>

            {/* Conteúdo da Lista */}
            {isOpen && (
                <div className="border-t border-border/40 max-h-[320px] overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar bg-surface-container-lowest">
                    {debtors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-foreground-muted gap-3">
                            <CheckCircleIcon className="w-10 h-10 text-emerald-500/50" />
                            <p className="font-sans text-sm font-medium m-0">Tudo em dia! Sem pendências.</p>
                        </div>
                    ) : (
                        debtors.map((debtor, idx) => {
                            const waLink = getWhatsAppLink(
                                debtor.phone,
                                `Olá ${debtor.patientName}, gostaria de lembrar sobre o pagamento pendente de ${formatCurrency(debtor.amount)} referente à sessão do dia ${new Date(debtor.date).toLocaleDateString('pt-BR')}.`
                            );
                            return (
                                <div key={idx} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-border/40 hover:border-border transition-colors">
                                    <div className="flex flex-col gap-1 min-w-0 pr-3">
                                        <p className="font-semibold text-on-surface text-sm font-sans truncate m-0">
                                            {debtor.patientName}
                                        </p>
                                        <p className="text-xs text-foreground-muted font-sans font-medium m-0 flex items-center gap-1.5 flex-wrap">
                                            <span>{new Date(debtor.date).toLocaleDateString('pt-BR')}</span>
                                            <span className="text-border dark:text-white/20">•</span>
                                            <span className="font-bold text-pink-600 dark:text-pink-400">
                                                {formatCurrency(debtor.amount)}
                                            </span>
                                        </p>
                                    </div>
                                    {waLink && (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 p-2.5 rounded-full transition-colors shrink-0 outline-none focus:ring-2 focus:ring-emerald-500/50 flex items-center justify-center"
                                            title="Cobrar via WhatsApp"
                                        >
                                            <WhatsappIcon className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    );
};
