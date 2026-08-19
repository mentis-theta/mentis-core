import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Patient, Session, Goal } from "../types.ts";
import { formatBirthDate, formatDateTime, formatDate } from "../utils/formatters.ts";
import { isClinicallyNotable } from "../utils/domainScoring.ts";
import type { ScaleDefinition, ScaleName } from "../utils/assessmentScales.ts";

export const generatePatientPDF = (patient: Patient, sessions: Session[], goals: Goal[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Mentis - Prontuário Eletrônico", 105, 15, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(10, 20, 200, 20);

    // Patient Info
    doc.setFontSize(14);
    doc.text("Dados do Paciente", 14, 30);

    doc.setFontSize(10);
    const leftColX = 14;
    const rightColX = 110;
    let currentY = 40;

    doc.text(`Nome: ${patient.name}`, leftColX, currentY);
    doc.text(`CPF: ${patient.cpf}`, rightColX, currentY);
    currentY += 6;

    doc.text(`Data de Nascimento: ${formatBirthDate(patient.birthDate)}`, leftColX, currentY);
    doc.text(`Telefone: ${patient.phone || 'N/A'}`, rightColX, currentY);
    currentY += 6;

    doc.text(`Email: ${patient.email || 'N/A'}`, leftColX, currentY);
    currentY += 10;

    // Medical History
    doc.setFontSize(12);
    doc.text("Histórico Médico", 14, currentY);
    currentY += 6;
    doc.setFontSize(10);

    const splitHistory = doc.splitTextToSize(patient.medicalHistory || "Nenhum histórico informado.", 180);
    doc.text(splitHistory, 14, currentY);
    currentY += (splitHistory.length * 5) + 10;

    // Treatment Goals
    doc.setFontSize(12);
    doc.text("Plano de Tratamento (Metas Ativas)", 14, currentY);
    currentY += 6;

    const activeGoals = goals.filter(g => g.status === 'in_progress');
    if (activeGoals.length > 0) {
        const goalsData = activeGoals.map(g => [g.title, g.description || '-']);
        autoTable(doc, {
            startY: currentY,
            head: [['Meta', 'Descrição']],
            body: goalsData,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] } // Slate-900 like
        });
        // Update Y based on table
        currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.text("Nenhuma meta ativa no momento.", 14, currentY);
        currentY += 10;
    }

    // Session History
    doc.setFontSize(12);
    doc.text("Histórico de Sessões", 14, currentY);
    currentY += 6;

    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedSessions.length > 0) {
        const sessionsData = sortedSessions.map(s => {
            // Se houver um printSummary gerado pelo usuário/IA, usa ele.
            // Senão, usa as notes (com a limitação original se for muito grande, ou podemos até deixar inteiro agora).
            // Vamos deixar inteiro se o usuário não editou, pois o autotable quebra linhas agora.
            const textToPrint = (s as any).printSummary ?? s.notes ?? '-';
            
            return [
                formatDateTime(s.date),
                s.sessionType,
                `${s.duration} min`,
                textToPrint
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Data', 'Tipo', 'Duração', 'Resumo']],
            body: sessionsData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' } // autotable faz o word-wrap
            },
            styles: {
                // Ensure text wraps properly instead of overflowing
                overflow: 'linebreak',
                valign: 'top',
                cellPadding: 3
            }
        });
    } else {
        doc.setFontSize(10);
        doc.text("Nenhuma sessão registrada.", 14, currentY + 4);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString()}`, 105, 290, { align: "center" });
    }

    doc.save(`Prontuario_${patient.name.replace(/\s+/g, '_')}.pdf`);
};

export const generatePsychometricPDF = (
    record: any,
    patientName: string,
    scaleData: ScaleDefinition
) => {
    const doc = new jsPDF();
    const scaleId = scaleData.id;
    const responses = record.content?.responses || [];

    // Header
    doc.setFontSize(20);
    doc.text("Folha de Respostas - Psicometria", 105, 15, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(10, 20, 200, 20);

    // Info
    doc.setFontSize(12);
    doc.text(`Paciente: ${patientName}`, 14, 30);
    doc.text(`Escala: ${scaleData.name}`, 14, 36);
    doc.text(`Data: ${formatDate(record.date)}`, 14, 42);
    
    doc.setFontSize(10);
    doc.text(`Score Final: ${record.metadata.score}`, 14, 50);
    if (record.metadata.severity) {
        doc.text(`Severidade/Interpretação: ${record.metadata.severity}`, 14, 56);
    }

    let currentY = 66;

    // Build Table Data
    const tableData = scaleData.questions.map((q, idx) => {
        const val = responses[idx];
        if (val === null || val === undefined) {
            return [String(q.index + 1), q.domain, q.text, "Não respondida / N/A", ""];
        }

        const options = q.answerOptions || scaleData.answerOptions;
        let labelText = options?.find((o: any) => o.value === val)?.label || String(val);
        
        if (scaleId === 'CBI') {
            labelText = options?.find((o: any) => o.value === val)?.label || `${val}%`;
        }

        const isNotable = isClinicallyNotable(scaleId, idx, val);
        const isCritical = scaleId === 'PHQ-9' && idx === 8 && val > 0;
        
        let alert = "";
        if (isCritical) alert = "[RISCO IMINENTE]";
        else if (isNotable) alert = "[!]";

        return [
            String(q.index + 1),
            q.domain,
            q.text,
            labelText,
            alert
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Domínio', 'Pergunta', 'Resposta do Paciente', 'Alerta']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 30 },
            2: { cellWidth: 'auto' }, // Pergunta word-wrap
            3: { cellWidth: 40 },
            4: { cellWidth: 20, textColor: [220, 38, 38], fontStyle: 'bold' } // Alertas em vermelho
        },
        styles: {
            overflow: 'linebreak',
            valign: 'top',
            cellPadding: 3,
            fontSize: 9
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Notas (se existirem)
    if (record.content?.notes) {
        doc.setFontSize(12);
        doc.text("Notas da Avaliação", 14, currentY);
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(record.content.notes, 180);
        doc.text(splitNotes, 14, currentY + 6);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount} - Mentis Health`, 105, 290, { align: "center" });
    }

    const safeName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Mentis_Respostas_${scaleId}_${safeName}.pdf`);
};
