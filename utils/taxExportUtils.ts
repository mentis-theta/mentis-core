import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UnifiedTransaction } from '@/hooks/useFinancialData';
import { Patient, Invoice, Expense } from '@/types';

interface TaxExportResult {
    success: boolean;
    missingCpfCount: number;
    fileName?: string;
    error?: string;
}

export interface TaxDbData {
    invoices: Invoice[];
    expenses: Expense[];
}

/**
 * Escapa uma string para CSV usando ponto-e-vírgula (Padrão PT-BR).
 */
const escapeCSV = (str: string | undefined | null) => {
    if (!str) return '';
    const stringified = String(str);
    if (stringified.includes(';') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
};

/**
 * Converte número para formato PT-BR para evitar quebra no Excel (150.00 -> 150,00)
 */
const formatMonetary = (value: number) => {
    return value.toFixed(2).replace('.', ',');
};

export const generateTaxExport = (
    selectedMonths: string[], // e.g. ['2026-05', '2026-04']
    dbData: TaxDbData,
    patients: Patient[],
    taxRegime: 'pf' | 'pj'
): TaxExportResult => {
    try {
        // 1. Filtrar Invoices (type === session/monthly) e Expenses (type === income)
        const validIncomes: Array<{ date: string; amount: number; patientId?: string; description: string }> = [];

        dbData.invoices.forEach(inv => {
            if (inv.status === 'paid') {
                const dateKey = format(parseISO(inv.due_date), 'yyyy-MM');
                if (selectedMonths.includes(dateKey)) {
                    validIncomes.push({
                        date: inv.due_date,
                        amount: inv.amount,
                        patientId: inv.patient_id,
                        description: inv.type === 'monthly' ? 'Mensalidade' : 'Sessão'
                    });
                }
            }
        });

        dbData.expenses.forEach(exp => {
            if (exp.type === 'income' && exp.is_paid !== false) {
                const dateKey = format(parseISO(exp.date), 'yyyy-MM');
                if (selectedMonths.includes(dateKey)) {
                    validIncomes.push({
                        date: exp.date,
                        amount: exp.amount,
                        description: exp.description
                    });
                }
            }
        });

        // Ordenar da mais antiga para a mais recente
        validIncomes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let missingCpfCount = 0;
        let csvContent = '';

        // Nomenclatura das colunas adaptada à "Bifurcação Inteligente" e "Pediatria"
        if (taxRegime === 'pf') {
            const headers = ['Data', 'Nome do Paciente / Beneficiário', 'CPF do Pagador', 'Histórico', 'Valor (R$)'];
            const rows = validIncomes.map(trx => {
                const patient = patients.find(p => p.id === trx.patientId);
                const cpf = patient?.cpf || '';
                
                if (trx.patientId && !cpf) missingCpfCount++;

                const dateStr = format(parseISO(trx.date), 'dd/MM/yyyy');
                const name = patient?.name || (trx.patientId ? 'Paciente Desconhecido' : 'Receita Avulsa');
                const history = escapeCSV(trx.description);
                const value = formatMonetary(trx.amount);

                return `${dateStr};${escapeCSV(name)};${escapeCSV(cpf)};${history};${value}`;
            });

            csvContent = [headers.join(';'), ...rows].join('\n');
        } else {
            // PJ Logic (DMED / Domínio)
            const headers = ['Data do Pagamento', 'Nome do Paciente / Beneficiário', 'CPF do Pagador', 'Valor da Nota (R$)'];
            const rows = validIncomes.map(trx => {
                const patient = patients.find(p => p.id === trx.patientId);
                const cpf = patient?.cpf || '';
                
                if (trx.patientId && !cpf) missingCpfCount++;

                const dateStr = format(parseISO(trx.date), 'dd/MM/yyyy');
                const name = patient?.name || (trx.patientId ? 'Paciente Desconhecido' : 'Receita Avulsa');
                const value = formatMonetary(trx.amount);

                return `${dateStr};${escapeCSV(name)};${escapeCSV(cpf)};${value}`;
            });

            csvContent = [headers.join(';'), ...rows].join('\n');
        }

        // 2. Gerar nome de arquivo inteligente com o carimbo de responsabilidade
        const sortedMonths = [...selectedMonths].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const regimeName = taxRegime.toUpperCase();
        let monthSuffix = '';
        const year = sortedMonths[0].split('-')[0];

        if (sortedMonths.length === 1) {
            const m = parseISO(`${sortedMonths[0]}-01`);
            const mesCap = format(m, 'MMM', { locale: ptBR });
            monthSuffix = mesCap.charAt(0).toUpperCase() + mesCap.slice(1);
        } else {
            const first = parseISO(`${sortedMonths[0]}-01`);
            const last = parseISO(`${sortedMonths[sortedMonths.length - 1]}-01`);
            const mesFirst = format(first, 'MMM', { locale: ptBR });
            const mesLast = format(last, 'MMM', { locale: ptBR });
            monthSuffix = `${mesFirst.charAt(0).toUpperCase() + mesFirst.slice(1)}-${mesLast.charAt(0).toUpperCase() + mesLast.slice(1)}`;
        }

        // Ex: MENTIS_Relatorio_Fiscal_PF_Jan-Mar_2026.csv
        const fileName = `MENTIS_Relatorio_Fiscal_${regimeName}_${monthSuffix}_${year}.csv`;

        // 3. Disparar o Download
        // Note: Adding BOM (\uFEFF) for Excel to read UTF-8 properly
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);

        return {
            success: true,
            missingCpfCount,
            fileName
        };
    } catch (error) {
        console.error('Erro na exportação fiscal:', error);
        return {
            success: false,
            missingCpfCount: 0,
            error: 'Ocorreu um erro ao gerar o arquivo fiscal.'
        };
    }
};
