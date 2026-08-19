import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePatientContext } from '../contexts/PatientContext';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { format, subMonths, parseISO, getDaysInMonth, setDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Expense, Invoice } from '../types';
import { useGlobalSessions } from './useGlobalSessions';

interface FinancialMonth {
    monthLabel: string;
    monthKey: string;
    revenue: number;
    expenses: number;
}

export interface Debtor {
    patientName: string;
    patientId: string;
    amount: number;
    date: string;
    phone: string;
}

export interface CurrentMonthMetrics {
    revenue: number;
    expenses: number;
    balance: number;
    goal: number;
    goalPercentage: number;

    // Operational Metrics
    activePatients: number;
    totalSessions: number;
    cancelRate: number;
    attendanceRate: number;
    averageTicket: number;
}

export interface UnifiedTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    status: 'paid' | 'pending';
    source: 'session' | 'manual' | 'invoice';
    patientId?: string;
    location?: string;
    modality?: string;
    paymentType?: string;
    metadata?: { sessionIds?: string[];[key: string]: any };
}

// Analytics 2.0 Interfaces
export interface ChartDataPoint {
    name: string;
    value: number;
    color?: string;
}

export interface DailyEvolution {
    day: number;
    fullDate: string;
    income: number;
    expense: number;
}

export const useFinancialData = (selectedDate: Date = new Date(), considerPending: boolean = false) => {
    const { currentUser } = useAuth();
    const { patients } = usePatientContext();
    const { globalSessions, isLoading: isGlobalSessionsLoading, refetch: refetchGlobalSessions } = useGlobalSessions();
    const MONTHLY_GOAL = currentUser?.monthly_goal || 10000;

    const fetchFinancials = async () => {
        if (!currentUser) return { expenses: [], invoices: [] };

        const [expensesRes, invoicesRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', currentUser.id),
            supabase.from('invoices').select('*').eq('user_id', currentUser.id)
        ]);

        if (expensesRes.error) throw expensesRes.error;
        if (invoicesRes.error) throw invoicesRes.error;

        return {
            expenses: expensesRes.data as Expense[],
            invoices: invoicesRes.data as Invoice[]
        };
    };

    const { data: dbData = { expenses: [], invoices: [] }, isLoading, refetch } = useQuery({
        queryKey: ['financial_data_unified', currentUser?.id],
        queryFn: fetchFinancials,
        enabled: !!currentUser?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const refresh = () => {
        refetch();
        refetchGlobalSessions();
    };

    const financialData = useMemo(() => {
        if (isLoading) return {
            history: [], current: null, globalDebtors: [], unifiedLedger: [],
            analytics: { daily: [], byLocation: [], byModality: [], byPaymentType: [] }
        };

        const currentKey = format(selectedDate, 'yyyy-MM');
        const daysInSelectedMonth = getDaysInMonth(selectedDate);
        const { expenses: dbTransactions, invoices: dbInvoices } = dbData;

        // --- 1. buckets helpers ---
        const months: FinancialMonth[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(selectedDate, i);
            months.push({
                monthLabel: format(d, 'MMM/yy', { locale: ptBR }),
                monthKey: format(d, 'yyyy-MM'),
                revenue: 0,
                expenses: 0
            });
        }

        const dailyMap = new Map<number, DailyEvolution>();
        for (let d = 1; d <= daysInSelectedMonth; d++) {
            dailyMap.set(d, {
                day: d,
                fullDate: format(setDate(selectedDate, d), 'dd/MM'),
                income: 0,
                expense: 0
            });
        }

        const locationMap = new Map<string, number>();
        const modalityMap = new Map<string, number>();
        const paymentMap = new Map<string, number>();

        const activePatientIds = new Set<string>();
        let sessionsThisMonth = 0;
        let canceledThisMonth = 0;
        let missedThisMonth = 0;
        let invoiceRevenueThisMonth = 0;
        const globalDebtors: Debtor[] = [];
        const unifiedLedger: UnifiedTransaction[] = [];

        const patientMap = new Map(patients.map(p => [p.id, p]));

        // --- 2. Iterate Invoices (New Single Source of Truth for Clinical Revenue) ---
        dbInvoices.forEach(inv => {
            const invDate = parseISO(inv.due_date);
            const key = format(invDate, 'yyyy-MM');
            const dayOfMonth = invDate.getDate();
            const amount = Number(inv.amount || 0);

            const isPaid = inv.status === 'paid';
            const isPending = inv.status === 'pending' || inv.status === 'overdue';
            const shouldCount = isPaid || (considerPending && isPending);

            const patient = patientMap.get(inv.patient_id);
            const patientName = patient?.name || 'Paciente Desconhecido';

            // A. History (Monthly Revenue)
            const monthData = months.find(m => m.monthKey === key);
            if (monthData && shouldCount) {
                monthData.revenue += amount;
            }

            // B. Analytics & Ledger (Selected Month)
            if (key === currentKey) {
                if (shouldCount) {
                    const daily = dailyMap.get(dayOfMonth);
                    if (daily) daily.income += amount;

                    invoiceRevenueThisMonth += amount;

                    const loc = patient?.defaultLocation || 'Consultório';
                    locationMap.set(loc, (locationMap.get(loc) || 0) + amount);

                    const mod = patient?.defaultModality || (inv.type === 'monthly' ? 'Mensalidade' : 'Sessão');
                    modalityMap.set(mod, (modalityMap.get(mod) || 0) + amount);

                    const pay = patient?.paymentType || 'particular';
                    paymentMap.set(pay, (paymentMap.get(pay) || 0) + amount);
                }

                unifiedLedger.push({
                    id: inv.id,
                    date: inv.due_date,
                    description: inv.type === 'monthly' ? `Mensalidade - ${patientName}` : `Sessão - ${patientName}`,
                    amount: amount,
                    type: 'income',
                    category: inv.type === 'monthly' ? 'Mensalidade' : 'Atendimento',
                    status: isPaid ? 'paid' : 'pending',
                    source: 'invoice',
                    patientId: inv.patient_id,
                    location: patient?.defaultLocation,
                    modality: patient?.defaultModality,
                    paymentType: patient?.paymentType,
                    metadata: inv.metadata
                });
            }

            // C. Global Debt (Always track pending)
            if (isPending) {
                globalDebtors.push({
                    patientName: patientName,
                    patientId: inv.patient_id,
                    phone: patient?.phone || '',
                    amount,
                    date: inv.due_date
                });
            }
        });


        // --- 3. Iterate Manual Expenses ---
        dbTransactions.forEach(trx => {
            const trxDate = parseISO(trx.date);
            const key = format(trxDate, 'yyyy-MM');
            const dayOfMonth = trxDate.getDate();
            const type = trx.type || 'expense';
            const amount = Number(trx.amount || 0);

            const isPaid = trx.is_paid !== false;
            const isPending = !isPaid;
            const shouldCount = isPaid || (considerPending && isPending);

            const monthData = months.find(m => m.monthKey === key);
            if (monthData && shouldCount) {
                if (type === 'expense') monthData.expenses += amount;
                else monthData.revenue += amount;
            }

            if (key === currentKey) {
                if (shouldCount) {
                    const daily = dailyMap.get(dayOfMonth);
                    if (daily) {
                        if (type === 'expense') daily.expense += amount;
                        else daily.income += amount;
                    }
                }

                unifiedLedger.push({
                    id: trx.id,
                    date: trx.date,
                    description: trx.description,
                    amount: amount,
                    type: type as 'income' | 'expense',
                    category: trx.category || (type === 'income' ? 'Outra Receita' : 'Geral'),
                    status: isPaid ? 'paid' : 'pending',
                    source: 'manual'
                });
            }
        });

        // --- 4. Fast Operational Check (Iterating globalSessions instead of patients) ---
        globalSessions.forEach(session => {
            if (!session.date) return;
            const sessionDate = parseISO(session.date);
            const key = format(sessionDate, 'yyyy-MM');
            if (key === currentKey) {
                if (session.status === 'completed') {
                    sessionsThisMonth++;
                    activePatientIds.add(session.patientId);
                }
                if (session.status === 'canceled') canceledThisMonth++;
                if (session.status === 'missed') missedThisMonth++;
            }
        });

        // --- 5. Final Aggregations ---
        const currentMonthData = months.find(m => m.monthKey === currentKey) || { revenue: 0, expenses: 0, monthKey: currentKey, monthLabel: '' };

        const current: CurrentMonthMetrics = {
            revenue: currentMonthData.revenue,
            expenses: currentMonthData.expenses,
            balance: currentMonthData.revenue - currentMonthData.expenses,
            goal: MONTHLY_GOAL,
            goalPercentage: (currentMonthData.revenue / MONTHLY_GOAL) * 100, // Destravado para > 100%
            activePatients: activePatientIds.size,
            totalSessions: sessionsThisMonth,
            cancelRate: sessionsThisMonth + canceledThisMonth + missedThisMonth > 0 ? ((canceledThisMonth + missedThisMonth) / (sessionsThisMonth + canceledThisMonth + missedThisMonth)) * 100 : 0,
            attendanceRate: sessionsThisMonth + canceledThisMonth + missedThisMonth > 0 ? (sessionsThisMonth / (sessionsThisMonth + canceledThisMonth + missedThisMonth)) * 100 : 100,
            averageTicket: sessionsThisMonth > 0 ? invoiceRevenueThisMonth / sessionsThisMonth : 0,
        };

        const dailyArr = Array.from(dailyMap.values()).sort((a, b) => a.day - b.day);
        const locArr = Array.from(locationMap.entries()).map(([name, value]) => ({ name, value }));
        const modArr = Array.from(modalityMap.entries()).map(([name, value]) => ({ name, value }));
        const payArr = Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }));

        return {
            history: months,
            current,
            globalDebtors: globalDebtors.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            unifiedLedger: unifiedLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            analytics: {
                daily: dailyArr,
                byLocation: locArr,
                byModality: modArr,
                byPaymentType: payArr
            }
        };
    }, [dbData, isLoading, isGlobalSessionsLoading, selectedDate, considerPending, patients, globalSessions, MONTHLY_GOAL]);

    return {
        ...financialData,
        dbData,
        isLoading: isLoading || isGlobalSessionsLoading,
        refresh
    };
};
