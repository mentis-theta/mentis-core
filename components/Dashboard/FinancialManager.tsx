import React, { useState } from 'react';
import { useFinancialData, UnifiedTransaction } from '@/hooks/useFinancialData';
import { supabase } from '@/services/supabaseClient';
import { UnifiedTransactionList } from '@/components/Finance/UnifiedTransactionList';
import { SmartEntryModal } from '@/components/Finance/SmartEntryModal';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import { useToast } from '@/contexts/ToastContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGlobalSessions } from '@/hooks/useGlobalSessions';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SwitchHorizontalIcon, ArrowUpIcon, ArrowDownIcon, CurrencyDollarIcon, DocumentTextIcon, CalendarIcon } from '@/components/Icons';
import { Loader2 } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { FinancialAnalyticsDashboard } from '@/components/Finance/FinancialAnalyticsDashboard';
import { FinancialKPIs } from '@/components/Finance/FinancialKPIs';
import { TaxAdvisorWidget } from '@/components/Finance/TaxAdvisorWidget';
import { usePatientContext } from '@/contexts/PatientContext';
import { pdf } from '@react-pdf/renderer';
import { ReceiptDocument } from '@/components/Finance/ReceiptDocument';
import { TaxExportModal } from '@/components/Finance/TaxExportModal';

export const FinancialManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { openModal } = useModals();
    const { setExpenseToEdit } = useModalScheduling();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [considerPending, setConsiderPending] = useState(false); // Analytics 2.0 Toggle

    const [isSmartEntryOpen, setIsSmartEntryOpen] = useState(false);
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

    // Data Hook with Analytics 2.0
    const { history, current, globalDebtors, unifiedLedger, dbData, analytics, isLoading, refresh } = useFinancialData(selectedDate, considerPending);
    const { globalSessions, isLoading: isSessionsLoading } = useGlobalSessions();

    const { addToast } = useToast();
    const { expenseToEdit } = useModalScheduling();
    const navigate = useNavigate();
    const { patients } = usePatientContext();
    const { selectPatient } = useAppNavigation();
    const confirm = useConfirm();
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);


    const handleGenerateReceipt = async (trx: UnifiedTransaction) => {
        if (!currentUser || (trx.source !== 'session' && trx.source !== 'invoice') || !trx.patientId) return;

        const patient = patients.find(p => p.id === trx.patientId);
        if (!patient) {
 addToast("Paciente não encontrado.", "error");
            return;
        }

        // Para invoices, buscar a sessão pelo sessionId guardado no metadata
        const sessionId = trx.source === 'invoice'
            ? trx.metadata?.sessionIds?.[0]
            : trx.id;

        if (!sessionId) {
            addToast("Sessão não vinculada.", "error");
            return;
        }

        if (isSessionsLoading) {
            addToast("O catálogo de sessões ainda está carregando. Por favor, aguarde.", "warning");
            return;
        }

        const session = globalSessions.find(s => s.id === sessionId);
        if (!session) {
            addToast("Sessão não encontrada no catálogo. O paciente pode ter sido deletado.", "error");
            return;
        }

        if (trx.status !== 'paid') {
 addToast("Recibo disponível apenas para pagamentos confirmados.", "error");
            return;
        }

        if (!patient.cpf) {
 addToast("Complete o cadastro do paciente (CPF) para emitir recibo.", "error");
            return;
        }

        setGeneratingPdfId(trx.id);
        try {
            const blob = await pdf(
                <ReceiptDocument
                    professional={currentUser}
                    patient={patient}
                    session={session as any}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Recibo_${patient.name.split(' ')[0]}_${trx.date.split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
 addToast('Recibo gerado com sucesso!', 'success');
        } catch (error) {
 console.error(error);
 addToast('Erro ao gerar recibo.', 'error');
        } finally {
            setGeneratingPdfId(null);
        }
    };

    // Handlers
    const handleNextMonth = () => setSelectedDate(curr => addMonths(curr, 1));
    const handlePrevMonth = () => setSelectedDate(curr => subMonths(curr, 1));

    const handleEditTransaction = (trx: UnifiedTransaction) => {
        if (trx.source === 'session' || trx.source === 'invoice') {
 addToast("Edite sessões diretamente na ficha do paciente.", "info");
            if (trx.patientId) {
                selectPatient(trx.patientId);
            }
        } else {
            setExpenseToEdit({
                id: trx.id,
                description: trx.description,
                amount: trx.amount,
                date: trx.date,
                category: trx.category,
                is_paid: trx.status === 'paid',
                type: trx.type,
                user_id: ''
            });
            openModal('addExpense');
        }
    };

    const handleDeleteTransaction = async (id: string, source: string) => {
        const isConfirmed = await confirm({
            title: "Excluir lançamento?",
            message: "Tem certeza que deseja excluir este lançamento permanentemente?",
            confirmText: "Sim, excluir"
        });

        if (isConfirmed) {
            const table = source === 'invoice' ? 'invoices' : 'expenses';
            const { error } = await supabase.from(table).delete().eq('id', id);

            if (error) {
 addToast("Erro ao excluir.", "error");
            } else {
 addToast("Excluído com sucesso.", "success");
                refresh();
            }
        }
    };

    if (isLoading || isSessionsLoading || !current) {
        return <div className="p-8 text-center text-foreground-muted flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Carregando catálogo e dados financeiros...</span>
        </div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 bg-canvas min-h-full overflow-y-auto pb-20">
            {/* HEADER & CONTROLS */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="flex items-center gap-6">
                    <h1 className="text-[28px] font-bold text-on-surface font-sans m-0 tracking-tight">Financeiro</h1>

                    {/* Month Navigator */}
                    <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-border/20 shadow-sm">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface-container-lowest rounded-full text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="px-4 text-sm font-bold text-on-surface min-w-[120px] text-center capitalize font-sans">
                            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface-container-lowest rounded-full text-foreground-muted hover:text-on-surface transition-colors cursor-pointer outline-none">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`flex items-center px-5 py-2 rounded-xl transition-all border font-sans text-sm font-bold shadow-sm cursor-pointer outline-none ${showAnalytics ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-container-lowest border-border/60 text-foreground-muted hover:bg-surface-container-low hover:text-on-surface'}`}
                    >
                        <SwitchHorizontalIcon className="w-5 h-5 mr-2" />
                        {showAnalytics ? 'Ocultar Análise' : 'Ver Análise'}
                    </button>
                    <button
                        onClick={() => setIsTaxModalOpen(true)}
                        className="flex items-center px-5 py-2 bg-surface-container-lowest border border-border/60 text-foreground-muted rounded-xl hover:bg-surface-container-low hover:text-on-surface transition-all font-sans text-sm font-bold shadow-sm cursor-pointer outline-none"
                    >
                        <DocumentTextIcon className="w-5 h-5 mr-2" />
                        Exportar Fiscal
                    </button>
                    <button
                        onClick={() => setIsSmartEntryOpen(true)}
                        className="flex items-center px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 shadow-sm transition-all font-sans text-sm font-bold cursor-pointer outline-none"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Lançamento
                    </button>
                </div>
            </header>

            {/* 1. MINI SUMMARY CARDS (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                    title="Receitas"
                    value={current.revenue}
                    type="income"
                />
                <SummaryCard
                    title="Despesas"
                    value={current.expenses}
                    type="expense"
                />
                <SummaryCard
                    title="Saldo"
                    value={current.balance}
                    type="balance"
                >
                    <div className="mt-4 pt-4 border-t border-border/40">
                        <TaxAdvisorWidget 
                            revenue={current.revenue} 
                            expenses={current.expenses} 
                            taxRegime={currentUser?.taxRegime || 'pf'} 
                        />
                    </div>
                </SummaryCard>
            </div>

            {/* 1.5 OPERATIONAL KPIs (Comparecimento, Ticket Médio, etc) */}
            <FinancialKPIs data={current} />

            {/* 2. ANALYTICS DASHBOARD (Toggleable) */}
            {showAnalytics && (
                <div className="animate-fade-in-down">
                    <FinancialAnalyticsDashboard
                        history={history}
                        daily={analytics?.daily || []}
                        current={current}
                        analytics={analytics || { byLocation: [], byModality: [], byPaymentType: [] }}
                        debtors={globalDebtors}
                        considerPending={considerPending}
                        onTogglePending={setConsiderPending}
                    />
                </div>
            )}

            {/* 3. UNIFIED LEDGER (EXTRATO) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-on-surface flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-foreground-muted " />
                        Extrato de Movimentações
                    </h2>
                </div>

                <UnifiedTransactionList
                    transactions={unifiedLedger}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                    onGenerateReceipt={handleGenerateReceipt}
                    onAddNew={() => setIsSmartEntryOpen(true)}
                    generatingPdfId={generatingPdfId}
                />
            </div>

            {/* Modals */}
            <SmartEntryModal
                isOpen={isSmartEntryOpen}
                onClose={() => setIsSmartEntryOpen(false)}
                onAddSession={() => {
                    openModal('appointment');
                }}
                onAddExpense={() => {
                    setExpenseToEdit(null); // Clear edit state
                    openModal('addExpense');
                }}
                onAddIncome={() => {
                    // Set a temporary state for income mode
                    setExpenseToEdit({ type: 'income', description: '', amount: 0, category: '', date: '', is_paid: true, id: '', user_id: '' });
                    openModal('addExpense');
                }}
            />
            <TaxExportModal
                isOpen={isTaxModalOpen}
                onClose={() => setIsTaxModalOpen(false)}
                defaultRegime={currentUser?.taxRegime || 'pf'}
                dbData={dbData}
                patients={patients}
                currentMonthDate={selectedDate}
            />
        </div>
    );
};

// Sub-component for Mini Summary
const SummaryCard = ({ title, value, type, children }: { title: string, value: number, type: 'income' | 'expense' | 'balance', children?: React.ReactNode }) => {
    const isIncome = type === 'income';
    const isExpense = type === 'expense';
    const isBalance = type === 'balance';

    const config = {
        income: {
            icon: <ArrowUpIcon className="h-5 w-5" />,
            iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            accent: 'from-emerald-500/5 to-transparent',
            valueColor: 'text-emerald-600 dark:text-emerald-400'
        },
        expense: {
            icon: <ArrowDownIcon className="h-5 w-5" />,
            iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
            iconColor: 'text-rose-600 dark:text-rose-400',
            accent: 'from-rose-500/5 to-transparent',
            valueColor: 'text-rose-600 dark:text-rose-400'
        },
        balance: {
            icon: <CurrencyDollarIcon className="h-5 w-5" />,
            iconBg: 'bg-primary/10 dark:bg-primary/20',
            iconColor: 'text-primary dark:text-primary-foreground',
            accent: 'from-primary/5 to-transparent',
            valueColor: value >= 0 ? 'text-primary dark:text-primary-foreground' : 'text-rose-600 dark:text-rose-400'
        }
    }[type];

    return (
        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md group border border-border/40">
            {/* Subtle gradient accent on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] text-foreground-muted uppercase font-bold tracking-wider font-sans m-0">
                        {title}
                    </p>
                    <div className={`h-9 w-9 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconColor}`}>
                        {config.icon}
                    </div>
                </div>
                <h3 className={`text-2xl font-bold tracking-tight font-sans m-0 ${config.valueColor}`}>
                    {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                {children}
            </div>
        </div>
    );
};
