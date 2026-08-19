import React from 'react';
import { CurrencyDollarIcon, ArrowDownIcon, ArrowUpIcon, ExclamationIcon } from '@/components/Icons';

interface TaxAdvisorWidgetProps {
    revenue: number;
    expenses: number;
    taxRegime: 'pf' | 'pj';
}

export const TaxAdvisorWidget: React.FC<TaxAdvisorWidgetProps> = ({ revenue, expenses, taxRegime }) => {
    
    // PF Logic
    if (taxRegime === 'pf') {
        const netIncome = Math.max(0, revenue - expenses);

        if (netIncome <= 5000) {
            return (
                <div className="group/tax flex flex-col cursor-pointer mt-1">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ArrowUpIcon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Isenção PF (Seguro)</span>
                    </div>
                    <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/tax:max-h-40 opacity-0 group-hover/tax:opacity-100 group-hover/tax:mt-2">
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed m-0">
                            Seu imposto a pagar está zerado pelo desconto do governo, mas você é obrigado a declarar o IR. Operar como Pessoa Física ainda é seguro e vantajoso.
                        </p>
                    </div>
                </div>
            );
        }

        if (netIncome > 5000 && netIncome <= 7349) {
            // Simplified calculation just to show the decay conceptually
            const overLimit = netIncome - 5000;
            const decayEstimate = overLimit * 0.1331; 
            const estimatedTax = overLimit * 0.275 - decayEstimate;

            return (
                <div className="group/tax flex flex-col cursor-pointer mt-1">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <ArrowDownIcon className="h-4 w-4 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Atenção: Queda no Benefício</span>
                    </div>
                    <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/tax:max-h-40 opacity-0 group-hover/tax:opacity-100 group-hover/tax:mt-2">
                        <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 leading-relaxed m-0">
                            O desconto do IR está caindo. O governo está retendo aprox. <strong>{Math.max(0, estimatedTax).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>. Planeje transição para CNPJ.
                        </p>
                    </div>
                </div>
            );
        }

        // netIncome >= 7350
        const estimatedSavings = (netIncome * 0.275 - 884.96) * 12 - (revenue * 0.06 * 12);

        return (
            <div className="group/tax flex flex-col cursor-pointer mt-1">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <ExclamationIcon className="h-4 w-4 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Armadilha Financeira (Migre)</span>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/tax:max-h-40 opacity-0 group-hover/tax:opacity-100 group-hover/tax:mt-2">
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 leading-relaxed m-0">
                        O CPF virou uma armadilha. Migrar para CNPJ (Simples Nacional) agora pode economizar até <strong>{Math.max(0, estimatedSavings).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>/ano.
                    </p>
                </div>
            </div>
        );
    }

    // PJ Logic (Fator R)
    if (taxRegime === 'pj') {
        const proLabore = revenue * 0.28;

        if (proLabore > 7350) {
            return (
                <div className="group/tax flex flex-col cursor-pointer mt-1">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <ExclamationIcon className="h-4 w-4 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Teto do Pró-labore Atingido</span>
                    </div>
                    <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/tax:max-h-40 opacity-0 group-hover/tax:opacity-100 group-hover/tax:mt-2">
                        <p className="text-[11px] text-orange-600/90 dark:text-orange-400/90 leading-relaxed m-0">
                            Pró-labore ideal (28% = {proLabore.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) ultrapassa isenção do IRPF. O Simples Nacional pode não ser mais vantajoso. Consulte sobre Lucro Presumido.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="group/tax flex flex-col cursor-pointer mt-1">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Inteligência: Fator R (28%)</span>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover/tax:max-h-40 opacity-0 group-hover/tax:opacity-100 group-hover/tax:mt-2">
                    <div className="bg-blue-500/10 p-2 rounded-lg mt-1 border border-blue-500/20">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-blue-600/80 dark:text-blue-400/80">Meta Pró-labore:</span>
                            <strong className="text-blue-700 dark:text-blue-400">{proLabore.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                        </div>
                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-tight m-0 mt-1">
                            Mantenha este valor para garantir 6% no Anexo III.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
