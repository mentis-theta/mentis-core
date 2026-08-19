import React, { useRef } from 'react';
import { UnifiedTransaction } from '@/hooks/useFinancialData';
import { formatCurrency, formatShortDate } from '@/utils/formatters';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, PencilIcon, CheckCircleIcon, ClockIcon, PlusIcon } from '../Icons';
import Button from '../Button';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText } from 'lucide-react';

interface UnifiedTransactionListProps {
    transactions: UnifiedTransaction[];
    onEdit: (trx: UnifiedTransaction) => void;
    onDelete: (id: string, type: string) => void;
    onGenerateReceipt?: (trx: UnifiedTransaction) => void;
    onAddNew?: () => void;
    generatingPdfId?: string | null;
}

/* ── Status Badge (reutilizado nos dois layouts) ─────────────────── */
const StatusBadge = ({ status }: { status: string }) => (
    status === 'paid' ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircleIcon className="w-2.5 h-2.5 mr-1" /> Pago
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <ClockIcon className="w-2.5 h-2.5 mr-1" /> Pendente
        </span>
    )
);

/* ── Botões de Ação (alvos de toque ≥ 44px) ──────────────────────── */
const ActionButtons = ({ trx, onEdit, onDelete, onGenerateReceipt, generatingPdfId }: {
    trx: UnifiedTransaction;
    onEdit: (trx: UnifiedTransaction) => void;
    onDelete: (id: string, type: string) => void;
    onGenerateReceipt?: (trx: UnifiedTransaction) => void;
    generatingPdfId?: string | null;
}) => (
    <div className="flex items-center gap-1">
        {trx.source === 'manual' && (
            <>
                <button onClick={() => onEdit(trx)} aria-label="Editar transação" className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-auto md:w-auto p-3 md:p-1.5 text-foreground-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors cursor-pointer outline-none flex items-center justify-center"><PencilIcon className="h-4 w-4" /></button>
                <button onClick={() => onDelete(trx.id, trx.source)} aria-label="Excluir transação" className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-auto md:w-auto p-3 md:p-1.5 text-foreground-muted hover:text-pink-600 hover:bg-pink-500/10 rounded-full transition-colors cursor-pointer outline-none flex items-center justify-center"><TrashIcon className="h-4 w-4" /></button>
            </>
        )}
        {(trx.source === 'session' || trx.source === 'invoice') && trx.status === 'paid' && onGenerateReceipt && (
            <button
                onClick={() => onGenerateReceipt(trx)}
                title="Emitir Recibo"
                disabled={generatingPdfId === trx.id}
                className={`min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-auto md:w-auto p-3 md:p-1.5 rounded-full transition-colors flex items-center justify-center outline-none ${generatingPdfId === trx.id ? 'text-emerald-400 bg-emerald-500/5 cursor-wait' : 'text-foreground-muted hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer'}`}
            >
                {generatingPdfId === trx.id ? (
                    <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <FileText className="w-4 h-4 text-emerald-600 opacity-80" />
                )}
            </button>
        )}
    </div>
);

/* ── Card Mobile (exibido em < md) ───────────────────────────────── */
const MobileTransactionCard = ({ trx, onEdit, onDelete, onGenerateReceipt, generatingPdfId }: {
    trx: UnifiedTransaction;
    onEdit: (trx: UnifiedTransaction) => void;
    onDelete: (id: string, type: string) => void;
    onGenerateReceipt?: (trx: UnifiedTransaction) => void;
    generatingPdfId?: string | null;
}) => {
    const isIncome = trx.type === 'income';
    return (
        <div className="flex flex-col gap-3 p-4 border-b border-border/40 active:bg-surface-container transition-colors">
            {/* Linha 1: Ícone + Descrição + Valor */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-full flex-shrink-0 ${isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'}`}>
                        {isIncome ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface font-sans truncate">{trx.description}</p>
                        {(trx.source === 'session' || trx.source === 'invoice') && <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-primary mt-0.5">Sessão Vinculada</span>}
                    </div>
                </div>
                <p className={`text-sm font-bold font-sans whitespace-nowrap flex-shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface'}`}>
                    {isIncome ? '+' : '-'} {formatCurrency(trx.amount)}
                </p>
            </div>

            {/* Linha 2: Data + Categoria + Status + Ações */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-foreground-muted font-sans font-medium">{formatShortDate(trx.date)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-sans text-[11px] font-medium border border-border/40 truncate max-w-[100px]">
                        {trx.category}
                    </span>
                    <StatusBadge status={trx.status} />
                </div>
                <ActionButtons trx={trx} onEdit={onEdit} onDelete={onDelete} onGenerateReceipt={onGenerateReceipt} generatingPdfId={generatingPdfId} />
            </div>
        </div>
    );
};

/* ── Componente Principal ─────────────────────────────────────────── */
export const UnifiedTransactionList: React.FC<UnifiedTransactionListProps> = ({ transactions, onEdit, onDelete, onGenerateReceipt, onAddNew, generatingPdfId }) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: transactions.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 5,
    });

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-surface-container-lowest rounded-3xl border border-border/40">
                <div className="bg-surface-container-low p-6 rounded-full mb-4">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/30">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                </div>
                <h3 className="text-base font-bold text-on-surface font-sans mb-1">Seu fluxo de caixa está limpo este mês.</h3>
                <p className="text-sm text-foreground-muted font-sans max-w-xs mb-6">Nenhuma receita ou despesa registrada. Comece lançando sua primeira movimentação.</p>
                {onAddNew && (
                    <Button onClick={onAddNew} className="!rounded-xl px-6 py-2.5 !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 font-bold text-sm">
                        <PlusIcon className="w-5 h-5" />
                        Lançar Receita / Despesa
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 overflow-hidden flex flex-col">

            {/* ═══ LAYOUT DESKTOP (md+): Tabela virtualizada ═══ */}
            <div className="hidden md:flex md:flex-col md:flex-1">
                {/* Cabeçalho Fixo */}
                <div className="bg-surface-container-low border-b border-border/40 grid grid-cols-12 gap-4 px-6 py-4 shrink-0">
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted font-sans">Data</div>
                    <div className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-foreground-muted font-sans">Descrição</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted font-sans">Categoria</div>
                    <div className="col-span-2 text-right text-[10px] font-bold uppercase tracking-wider text-foreground-muted font-sans">Valor</div>
                    <div className="col-span-2 text-center text-[10px] font-bold uppercase tracking-wider text-foreground-muted font-sans">Ações / Status</div>
                </div>

                {/* Container de Scroll Virtualizado */}
                <div
                    ref={parentRef}
                    className="overflow-y-auto no-scrollbar"
                    style={{ height: '500px' }}
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                            const trx = transactions[virtualItem.index];
                            const isIncome = trx.type === 'income';

                            return (
                                <div
                                    key={virtualItem.key}
                                    className="absolute top-0 left-0 w-full hover:bg-surface-container transition-colors border-b border-border/40 grid grid-cols-12 gap-4 px-6 items-center group"
                                    style={{
                                        height: `${virtualItem.size}px`,
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                >
                                    <div className="col-span-2 text-sm text-foreground-muted font-sans font-medium">
                                        {formatShortDate(trx.date)}
                                    </div>
                                    <div className="col-span-4 flex items-center min-w-0">
                                        <div className={`mr-3 p-1.5 rounded-full flex-shrink-0 ${isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'}`}>
                                            {isIncome ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold text-on-surface font-sans truncate" title={trx.description}>
                                                    {trx.description}
                                                </p>
                                            </div>
                                            {(trx.source === 'session' || trx.source === 'invoice') && <span className="inline-block text-[10px] font-bold tracking-wide uppercase text-primary mt-0.5">Sessão Vinculada</span>}
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-sm text-foreground-muted truncate">
                                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-sans text-[11px] font-medium border border-border/40">
                                            {trx.category}
                                        </span>
                                    </div>
                                    <div className={`col-span-2 text-sm font-bold font-sans text-right ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface'}`}>
                                        {isIncome ? '+' : '-'} {formatCurrency(trx.amount)}
                                    </div>
                                    <div className="col-span-2 flex justify-center items-center gap-3">
                                        <StatusBadge status={trx.status} />
                                        <ActionButtons trx={trx} onEdit={onEdit} onDelete={onDelete} onGenerateReceipt={onGenerateReceipt} generatingPdfId={generatingPdfId} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══ LAYOUT MOBILE (< md): Cards verticais ═══ */}
            <div className="flex flex-col md:hidden overflow-y-auto max-h-[70vh]">
                {transactions.map((trx) => (
                    <MobileTransactionCard
                        key={trx.id}
                        trx={trx}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onGenerateReceipt={onGenerateReceipt}
                        generatingPdfId={generatingPdfId}
                    />
                ))}
            </div>
        </div>
    );
};
