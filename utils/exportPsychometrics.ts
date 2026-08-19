import type { InventoryRecord } from '@/types';
import { formatDate } from '@/utils/formatters';

/**
 * Exporta registros de inventário como CSV com BOM UTF-8.
 * Campos com vírgula ou quebra de linha são quoted corretamente.
 */
export function exportToCSV(
  records: InventoryRecord[],
  scaleName: string,
  patientName: string
): void {
  const escapeField = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const header = 'Data,Score,Severidade,Fonte,Sessão Vinculada,Notas';

  const rows = [...records]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => {
      const date = formatDate(r.date);
      const score = String(r.metadata.score);
      const severity = escapeField(r.metadata.severity || '');
      const source = r.metadata.source === 'patient_self_report' ? 'Paciente' : 'Manual';
      const session = r.metadata.session_id ? 'Sim' : '';
      const notes = escapeField(r.content.notes || '');
      return `${date},${score},${severity},${source},${session},${notes}`;
    });

  const csvContent = '\uFEFF' + [header, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeName = patientName.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').replace(/\s+/g, '_');
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}_${scaleName}_${today}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
