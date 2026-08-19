import React, { useState, useEffect } from 'react';
import type { Patient, Session } from '@/types.ts';
import { formatDate } from '@/utils/formatters.ts';
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { pdf } from '@react-pdf/renderer';
import { ReceiptDocument } from '../Finance/ReceiptDocument.tsx';
import { EllipsisVerticalIcon, DocumentIcon } from '../Icons';
import { useDecoupledData } from '@/hooks/useDecoupledData';
import { Loader2 } from 'lucide-react';

interface FinancialDashboardProps {
  patient: Patient;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ patient }) => {
  const { data: decoupledData, isLoading: isLoadingDecoupled } = useDecoupledData(patient.id, 'full_audit');
  const patientSessions = decoupledData?.sessions || [];
  
  const { summary, sortedSessions, formatCurrency } = useFinancialMetrics(patientSessions);
  const { currentUser } = useAuth();
 const { addToast } = useToast();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as HTMLElement).closest('.actions-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleGenerateReceipt = async (session: Session) => {
    if (!patient || !currentUser) return;

    if (session.paymentStatus !== 'paid') {
 addToast('Recibo disponível apenas para sessões pagas.', 'error');
      return;
    }

    if (!patient.cpf) {
 addToast('Erro: O paciente precisa ter um CPF cadastrado para emitir recibo.', 'error');
      return;
    }

    setGeneratingPdfId(session.id);
    try {
      const blob = await pdf(
        <ReceiptDocument
          professional={currentUser}
          patient={patient}
          session={session}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Recibo_${patient.name.split(' ')[0]}_${session.date.split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
 addToast('Recibo gerado com sucesso!', 'success');
    } catch (err) {
 console.error(err);
 addToast('Erro ao gerar PDF', 'error');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {isLoadingDecoupled ? (
        <div className="flex flex-col items-center justify-center p-12 h-64 bg-surface-container-lowest rounded-3xl border border-border/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-4 text-sm text-foreground-muted">Descriptografando histórico financeiro...</span>
        </div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Faturado */}
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-6 flex flex-col gap-1 transition-colors duration-200">
          <dt className="text-sm font-semibold text-foreground-muted font-sans uppercase tracking-wide">
            Total Faturado
          </dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight text-on-surface font-sans">
            {formatCurrency(summary.totalBilled)}
          </dd>
        </div>

        {/* Total Pago */}
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-6 flex flex-col gap-1 transition-colors duration-200">
          <dt className="text-sm font-semibold text-foreground-muted font-sans uppercase tracking-wide">
            Total Pago
          </dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-sans">
            {formatCurrency(summary.totalPaid)}
          </dd>
        </div>

        {/* Saldo Devedor */}
        <div className="w-full bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 p-6 flex flex-col gap-1 transition-colors duration-200">
          <dt className="text-sm font-semibold text-foreground-muted font-sans uppercase tracking-wide">
            Saldo Devedor
          </dt>
          <dd className={`mt-1 text-3xl font-bold tracking-tight font-sans ${summary.outstandingBalance > 0 ? 'text-pink-600 dark:text-pink-400' : 'text-on-surface'}`}>
            {formatCurrency(summary.outstandingBalance)}
          </dd>
        </div>
      </div>

      {/* Sessions Financial Table */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-on-surface font-sans px-1">
          Detalhes Financeiros
        </h3>

        <div className="w-full overflow-hidden rounded-3xl border border-border/40 bg-surface-container-lowest shadow-sm transition-colors duration-200">
          <div className="overflow-x-auto force-scroll-x no-scrollbar">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-surface-container-low">
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted font-sans">Data da Sessão</th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted font-sans">Duração</th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted font-sans">Valor</th>
                  <th scope="col" className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted font-sans">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted font-sans">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-transparent">
                {sortedSessions.map(session => (
                  <tr key={session.id} className="hover:bg-surface-container transition-colors group">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-on-surface font-sans">
                      {formatDate(session.date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted font-sans">
                      {session.duration} min
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-on-surface font-sans">
                      {formatCurrency(session.price)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-sans">
                      {session.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          Paga
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                      <div className="relative actions-dropdown-container inline-block text-left">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === session.id ? null : session.id); }}
                          className="p-2 rounded-full text-foreground-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-on-surface transition-colors outline-none"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>

                        {openDropdownId === session.id && (
                          <div className="absolute right-8 top-0 mt-2 w-48 origin-top-right rounded-2xl bg-surface-container-lowest shadow-md ring-1 ring-border/50 focus:outline-none z-50 border border-border/40 overflow-hidden">
                            <div className="py-1" role="menu">
                              <button
                                onClick={(e) => { e.preventDefault(); handleGenerateReceipt(session); setOpenDropdownId(null); }}
                                disabled={generatingPdfId === session.id}
                                className="w-full flex items-center px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <DocumentIcon className="mr-3 h-4 w-4 text-foreground-muted" />
                                {generatingPdfId === session.id ? 'Gerando...' : 'Emitir Recibo'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {sortedSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm font-medium text-foreground-muted font-sans">
                      Nenhuma sessão encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialDashboard;
