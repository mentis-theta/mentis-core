import React, { useState } from 'react';
import { useDataExport } from '@/hooks/useDataExport';
import Button from '@/components/Button';
import { DownloadIcon, ClipboardListIcon, ShieldCheckIcon } from '@/components/Icons';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { supabase } from '@/services/supabaseClient';
import { format, parseISO } from 'date-fns';
import { RefreshIcon } from '@/components/Icons';
import { ExportWarningModal } from './ExportWarningModal';
import { useCrypto } from '@/contexts/CryptoContext';
import * as cryptoService from '@/services/cryptoService';
import { Session } from '@/types';
export const BackupSettings: React.FC = () => {
    const { exportFullBackupJSON, exportSessionsCSV, isExporting } = useDataExport();
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const { masterKey } = useCrypto();
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

    const handleInitialBackupClick = () => {
        setIsWarningModalOpen(true);
    };

    const executeFullBackup = async () => {
        setLoadingAction('json');
        addToast('Baixando fragmentos seguros. Aguarde...', 'info');
        const res = await exportFullBackupJSON();
        if (res.success) {
            addToast('Backup completo finalizado!', 'success');
            setIsWarningModalOpen(false);
        } else {
            addToast(res.error || 'Falha no backup', 'error');
        }
        setLoadingAction(null);
    };

    const handleSessionsReport = async () => {
        setLoadingAction('csv');
        addToast('Gerando relatório de sessões...', 'info');
        const res = await exportSessionsCSV();
        if (res.success) addToast('Relatório gerado com sucesso!', 'success');
        else addToast(res.error || 'Falha ao gerar relatório', 'error');
        setLoadingAction(null);
    };

    const handleForceSyncFinancials = async () => {
        if (!currentUser) return;
        if (!confirm("Isso fará uma varredura profunda em todos os seus pacientes. Faturas órfãs serão removidas, e datas, valores e status serão sincronizados. Deseja continuar?")) return;
        
        setLoadingAction('sync');
        addToast('Analisando sessões e sincronizando financeiro...', 'info');
        
        try {
            const { data: existingInvoices, error: fetchErr } = await supabase
                .from('invoices')
                .select('id, amount, due_date, status, metadata')
                .eq('user_id', currentUser.id)
                .eq('type', 'session');
                
            if (fetchErr) throw fetchErr;
            
            let updatedCount = 0;
            let deletedCount = 0;
            let insertedCount = 0;
            
            // 1. Mapeia todas as sessões válidas (V1.1 E2EE)
            const sessionMap = new Map<string, any>();
            
            if (masterKey) {
                // Fetch all sessions for this user
                const { data: allSessionsData, error: sessionErr } = await supabase
                    .from('patient_sessions')
                    .select('*')
                    .eq('user_id', currentUser.id);
                    
                if (sessionErr) throw sessionErr;
                
                // Group by patient for quick lookup
                const patientMap = new Map(patients.map(p => [p.id, p]));
                
                const CHUNK_SIZE = 100;
                for (let i = 0; i < (allSessionsData?.length || 0); i += CHUNK_SIZE) {
                    const chunk = allSessionsData!.slice(i, i + CHUNK_SIZE);

                    for (const row of chunk) {
                        try {
                            const decryptedSession = cryptoService.decryptData<Session>(row.encrypted_data, masterKey);
                            if (decryptedSession && row.patient_id) {
                                const patient = patientMap.get(row.patient_id);
                                if (patient) {
                                    sessionMap.set(decryptedSession.id, { patient, session: decryptedSession });
                                }
                            }
                        } catch (e) {
                            console.error("Failed to decrypt session during sync", row.id);
                        }
                    }

                    // Protect the Event Loop!
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            } else {
                throw new Error("Master key is required for sync");
            }

            // 2. Remove faturas órfãs (sessão foi excluída mas a fatura ficou)
            for (const inv of existingInvoices || []) {
                if (inv.metadata && inv.metadata.sessionIds && inv.metadata.sessionIds.length > 0) {
                    const sId = inv.metadata.sessionIds[0];
                    if (!sessionMap.has(sId)) {
                        await supabase.from('invoices').delete().eq('id', inv.id);
                        deletedCount++;
                    }
                }
            }
            
            // 3. Atualiza, remove indevidas ou cria faltantes
            for (const { patient, session } of Array.from(sessionMap.values())) {
                const billingModel = patient.billing_settings?.model || 'per_session';
                const isBillable = session.status === 'completed' || (session.status === 'missed' && patient.billing_settings?.charge_missed_sessions);
                
                const matchingInvoices = existingInvoices?.filter(inv => 
                    inv.metadata && inv.metadata.sessionIds && inv.metadata.sessionIds.includes(session.id)
                ) || [];
                
                if (!isBillable || billingModel !== 'per_session') {
                    for (const inv of matchingInvoices) {
                        await supabase.from('invoices').delete().eq('id', inv.id);
                        deletedCount++;
                    }
                    continue;
                }

                if (matchingInvoices.length > 0) {
                    const matchingInvoice = matchingInvoices[0];
                    const targetDate = format(parseISO(session.date), 'yyyy-MM-dd');
                    const targetStatus = session.paymentStatus === 'paid' ? 'paid' : 'pending';
                    
                    const updates: any = {};
                    if (matchingInvoice.due_date !== targetDate) updates.due_date = targetDate;
                    if (matchingInvoice.amount !== session.price) updates.amount = session.price;
                    if (matchingInvoice.status !== targetStatus) updates.status = targetStatus;
                    
                    if (Object.keys(updates).length > 0) {
                        await supabase.from('invoices').update(updates).eq('id', matchingInvoice.id);
                        updatedCount++;
                    }
                    
                    if (matchingInvoices.length > 1) {
                         for (let i = 1; i < matchingInvoices.length; i++) {
                             await supabase.from('invoices').delete().eq('id', matchingInvoices[i].id);
                             deletedCount++;
                         }
                    }
                } else {
                     const targetDate = format(parseISO(session.date), 'yyyy-MM-dd');
                     const sessionDateObj = new Date(session.date);
                     const billingPeriod = `${sessionDateObj.getFullYear()}-${String(sessionDateObj.getMonth() + 1).padStart(2, '0')}`;
                     
                     await supabase.from('invoices').insert({
                        user_id: currentUser.id,
                        patient_id: patient.id,
                        amount: session.price,
                        due_date: targetDate,
                        status: session.paymentStatus === 'paid' ? 'paid' : 'pending',
                        billing_period: billingPeriod,
                        type: 'session',
                        metadata: { sessionIds: [session.id] }
                     });
                     insertedCount++;
                }
            }
            
            addToast(`Sucesso! Atualizadas: ${updatedCount}, Removidas: ${deletedCount}, Criadas: ${insertedCount}.`, 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao sincronizar financeiro.', 'error');
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-8">
            <div className="mb-6">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center">
                    <ShieldCheckIcon className="w-4 h-4 mr-2 text-primary/60" />
                    Backup e Exportação de Dados
                </h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-1 opacity-70">
                    Você tem total controle sobre seus dados. Realize backups regulares ou exporte relatórios.
                </p>
                <div className="border-b border-border/40 mt-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Completo */}
                <div className="border border-border/40 rounded-3xl p-6 hover:border-primary/40 transition-all bg-surface/50 dark:bg-slate-700/20 group">
                    <div className="flex items-center mb-4">
                        <div className="bg-primary/10 p-2.5 rounded-2xl mr-3 group-hover:scale-110 transition-transform">
                            <DownloadIcon className="h-5 w-5 text-primary" />
                        </div>
                        <h4 className="text-xs font-black text-foreground uppercase tracking-tight">Backup Completo do Sistema</h4>
                    </div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-60 leading-relaxed">
                        Baixe uma cópia de segurança criptografada de todos os seus dados em formato JSON.
                            <Button 
                                variant="secondary" 
                                onClick={handleInitialBackupClick} 
                                isLoading={loadingAction === 'json'}
                                disabled={isExporting}
                                className="w-full sm:w-auto mt-4 sm:mt-0 !h-11 shadow-sm font-semibold border-slate-200 dark:border-slate-700/50"
                            >
                                <DownloadIcon className="w-4 h-4 mr-2 text-slate-500" />
                                Baixar Arquivo (.json)
                            </Button>
                    </p>
                </div>

                {/* Relatório de Sessões */}
                <div className="border border-border/40 rounded-3xl p-6 hover:border-green-500/40 transition-all bg-surface/50 dark:bg-slate-700/20 group">
                    <div className="flex items-center mb-4">
                        <div className="bg-green-500/10 p-2.5 rounded-2xl mr-3 group-hover:scale-110 transition-transform">
                            <ClipboardListIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <h4 className="text-xs font-black text-foreground uppercase tracking-tight">Relatório de Sessões</h4>
                    </div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-60 leading-relaxed">
                        Baixe o histórico completo de atendimentos em formato CSV (Excel) para conferência.
                    </p>
                    <Button
                        variant="secondary"
                        onClick={handleSessionsReport}
                        disabled={!!loadingAction}
                        className="w-full border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 flex items-center justify-center gap-2"
                        isLoading={loadingAction === 'csv'}
                    >
                        <ClipboardListIcon className="w-4 h-4" /> Baixar Relatório (CSV)
                    </Button>
                </div>

                {/* Sincronização Financeira */}
                <div className="border border-border/40 rounded-3xl p-6 hover:border-purple-500/40 transition-all bg-surface/50 dark:bg-slate-700/20 group md:col-span-2">
                    <div className="flex items-center mb-4">
                        <div className="bg-purple-500/10 p-2.5 rounded-2xl mr-3 group-hover:scale-110 transition-transform">
                            <RefreshIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <h4 className="text-xs font-black text-foreground uppercase tracking-tight">Sincronização de Faturas</h4>
                    </div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-6 opacity-60 leading-relaxed">
                        Varre todos os seus pacientes e sessões para garantir que o financeiro esteja perfeitamente alinhado com as datas e valores atuais. Útil para corrigir lentidões ou erros passados.
                    </p>
                    <Button
                        variant="secondary"
                        onClick={handleForceSyncFinancials}
                        disabled={!!loadingAction}
                        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20 flex items-center justify-center gap-2"
                        isLoading={loadingAction === 'sync'}
                    >
                        <RefreshIcon className="w-4 h-4" /> Corrigir Datas e Valores Financeiros
                    </Button>
                </div>
            </div>

            <div className="mt-6 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-widest opacity-80">
                    <strong>Nota de Segurança:</strong> Os arquivos exportados contém dados sensíveis. Armazene-os em local seguro e criptografado.
                </p>
            </div>

            <ExportWarningModal 
                isOpen={isWarningModalOpen} 
                onClose={() => setIsWarningModalOpen(false)} 
                onConfirm={executeFullBackup}
                isExporting={loadingAction === 'json' || isExporting}
            />
        </div>
    );
};
