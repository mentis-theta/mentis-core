import { useState } from 'react';
import { usePatientContext } from '../contexts/PatientContext';
import { useAuth } from '../contexts/AuthContext';
import { useCrypto } from '../contexts/CryptoContext';
import { supabase } from '../services/supabaseClient';
import { Patient, Session, Goal, Document } from '../types';
import { format } from 'date-fns';
import { getPlainTextFromSession } from '../components/Session/RichTextRenderer.tsx';
import * as cryptoService from '../services/cryptoService';
import * as Sentry from '@sentry/react';

export const useDataExport = () => {
    const { patients } = usePatientContext(); // Already decrypted in context
    const { currentUser } = useAuth();
    const { masterKey } = useCrypto();
    const [isExporting, setIsExporting] = useState(false);

    // V1.1 E2EE: Helper to hydrate a patient with data from isolated tables
    const hydratePatientDetails = async (patientId: string): Promise<{ sessions: Session[]; goals: Goal[]; documents: Document[] }> => {
        if (!masterKey) return { sessions: [], goals: [], documents: [] };
        try {
            const [sessionsRes, goalsRes, docsRes] = await Promise.all([
                supabase.from('patient_sessions').select('*').eq('patient_id', patientId),
                supabase.from('patient_goals').select('*').eq('patient_id', patientId),
                supabase.from('patient_documents').select('*').eq('patient_id', patientId)
            ]);
            const decryptChunked = async <T>(data: any[], type: 'Session' | 'Goal' | 'Document'): Promise<T[]> => {
                const results: T[] = [];
                const CHUNK_SIZE = 100;
                for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                    const chunk = data.slice(i, i + CHUNK_SIZE);
                    for (const r of chunk) {
                        try {
                            const decrypted = cryptoService.decryptData<T>(r.encrypted_data, masterKey);
                            if (decrypted) results.push(decrypted);
                        } catch { /* ignore */ }
                    }
                    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to Event Loop
                }
                return results;
            };

            const sessions = await decryptChunked<Session>(sessionsRes.data || [], 'Session');
            const goals = await decryptChunked<Goal>(goalsRes.data || [], 'Goal');
            const documents = await decryptChunked<Document>(docsRes.data || [], 'Document');

            return { sessions, goals, documents };
        } catch (e) {
            Sentry.captureException(e, { extra: { context: 'hydratePatientDetails', patientId } });
            return { sessions: [], goals: [], documents: [] };
        }
    };

    // Helpers
    const downloadBlob = (content: string, filename: string, type: 'csv' | 'json') => {
        const blob = new Blob([content], { type: type === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const escapeCSV = (str: string | number | boolean | undefined | null) => {
        if (str === undefined || str === null) return '';
        const stringified = String(str);
        if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
            return `"${stringified.replace(/"/g, '""')}"`;
        }
        return stringified;
    };

    // 1. Export Patients CSV
    const exportPatientsCSV = async () => {
        setIsExporting(true);
        try {
            const headers = ['ID', 'Nome', 'Status', 'Email', 'Telefone', 'CPF', 'Data Nascimento', 'Criado Em'];
            const rows = patients.map(p => [
                p.id,
                p.name,
                p.status,
                p.email,
                p.phone,
                p.cpf,
                p.birthDate,
                p.createdAt
            ].map(escapeCSV).join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');
            downloadBlob(csvContent, `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'csv');
            return { success: true };
        } catch (error) {
 console.error(error);
            return { success: false, error: 'Erro ao gerar CSV de pacientes.' };
        } finally {
            setIsExporting(false);
        }
    };

    // 2. Export Sessions CSV
    const exportSessionsCSV = async () => {
        if (!masterKey) return { success: false, error: 'Cofre bloqueado.' };
        setIsExporting(true);
        try {
            const headers = ['Data', 'Hora', 'Duração (min)', 'Paciente', 'Status', 'Tipo', 'Valor', 'Pago?', 'Notas'];

            // V1.1 E2EE: Fetch sessions from isolated tables instead of relying on lazy-loaded context
            const allSessions: (Session & { patientName: string })[] = [];
            for (const p of patients) {
                const { sessions } = await hydratePatientDetails(p.id);
                allSessions.push(...sessions.map(s => ({ ...s, patientName: p.name })));
            }
            allSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const rows = allSessions.map(s => {
                const dateObj = new Date(s.date);
                const dateStr = format(dateObj, 'dd/MM/yyyy');
                const timeStr = format(dateObj, 'HH:mm');

                return [
                    dateStr,
                    timeStr,
                    s.duration,
                    s.patientName,
                    s.status,
                    s.sessionType,
                    s.price,
                    s.paymentStatus === 'paid' ? 'Sim' : 'Não',
                    getPlainTextFromSession(s.notes)
                ].map(escapeCSV).join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            downloadBlob(csvContent, `sessoes_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'csv');
            return { success: true };
        } catch (error) {
 console.error(error);
            return { success: false, error: 'Erro ao gerar CSV de sessões.' };
        } finally {
            setIsExporting(false);
        }
    };

    // 3. Full Backup JSON (Includes Expenses if any)
    const exportFullBackupJSON = async () => {
        if (!currentUser || !masterKey) return { success: false, error: 'Autenticação necessária.' };
        setIsExporting(true);
        try {
            // Fetch Expenses
            const { data: expenses } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', currentUser.id);

            // Fetch Patients using Pagination (Chunking) to avoid 1000 limit
            let allDecryptedPatients: Patient[] = [];
            let startIndex = 0;
            const pageSize = 999;
            let hasMore = true;

            while (hasMore) {
                const { data: patientsChunk, error } = await supabase
                    .from('patients')
                    .select('*')
                    .range(startIndex, startIndex + pageSize - 1);

                if (error) throw error;

                if (patientsChunk && patientsChunk.length > 0) {
                    // Decrypt patients chunked
                    const CHUNK_SIZE = 50;
                    const decryptedChunk: Patient[] = [];
                    for (let j = 0; j < patientsChunk.length; j += CHUNK_SIZE) {
                        const subChunk = patientsChunk.slice(j, j + CHUNK_SIZE);
                        for (const row of subChunk) {
                            try {
                                const patientData = cryptoService.decryptData<any>(row.encrypted_data, masterKey);
                                decryptedChunk.push({
                                    ...patientData,
                                    id: row.id,
                                    displayName: row.display_name || '',
                                } as Patient);
                            } catch (e) {
                                Sentry.captureException(e, { extra: { patientId: row.id, phase: 'exportBackup_decryption' } });
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 0)); // Yield
                    }

                    allDecryptedPatients = [...allDecryptedPatients, ...decryptedChunk];
                    startIndex += pageSize;
                }

                if (!patientsChunk || patientsChunk.length < pageSize) {
                    hasMore = false;
                }
            }

            // V1.1 E2EE: Hydrate each patient with data from isolated tables
            for (let i = 0; i < allDecryptedPatients.length; i++) {
                const p = allDecryptedPatients[i];
                const details = await hydratePatientDetails(p.id);
                allDecryptedPatients[i] = {
                    ...p,
                    sessions: details.sessions,
                    goals: details.goals,
                    documents: details.documents
                };
            }

            const backupData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                exportedBy: currentUser.email,
                patients: allDecryptedPatients, // Full exported set
                expenses: expenses || [],
            };

            const jsonContent = JSON.stringify(backupData, null, 2);
            downloadBlob(jsonContent, `mentis_backup_${format(new Date(), 'yyyy-MM-dd')}.json`, 'json');
            return { success: true };

        } catch (error) {
 console.error(error);
            return { success: false, error: 'Erro ao gerar backup completo.' };
        } finally {
            setIsExporting(false);
        }
    };

    return {
        isExporting,
        exportPatientsCSV,
        exportSessionsCSV,
        exportFullBackupJSON
    };
};
