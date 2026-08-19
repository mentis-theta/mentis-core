import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { formatCurrencyToWords } from '@/utils/formatCurrencyToWords';
import { formatDate } from '@/utils/formatters';
import type { User, Patient, Session } from '@/types';
import { styles as baseStyles, DocHeader, DocFooter, DocSignature } from './DocumentComponents';

interface ReceiptDocumentProps {
    professional: User;
    patient: Patient;
    session: Session;
}

// Estilos específicos para o recibo, emulando o Neuro-Minimalismo no PDF
const receiptStyles = StyleSheet.create({
    amountContainer: {
        backgroundColor: '#f8fafc', // equivalente ao slate-50
        border: '1pt solid #e2e8f0', // border-border
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    amountLabel: {
        fontSize: 10,
        color: '#64748b', // text-foreground-muted
        textTransform: 'uppercase',
        marginBottom: 4,
        fontFamily: 'Helvetica-Bold',
    },
    amountValue: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a', // text-on-surface
    },
    textBody: {
        fontSize: 12,
        lineHeight: 1.6,
        color: '#334155',
        textAlign: 'justify',
        marginBottom: 16,
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
    },
    dateCity: {
        fontSize: 11,
        color: '#64748b',
        textAlign: 'right',
        marginTop: 30,
        marginBottom: 40,
    }
});

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({ professional, patient, session }) => {
    const amount = session.price || 0;
    const amountInWords = formatCurrencyToWords(amount);
    const sessionDate = formatDate(session.date);

    // Data de emissão automatizada (Hoje)
    const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const patientName = patient.name;
    const patientCpf = patient.cpf || '__________________';

    return (
        <Document>
            <Page size="A4" style={baseStyles.page}>
                <DocHeader
                    professional={professional}
                    title="Recibo de Pagamento"
                />

                <View style={baseStyles.content}>
                    {/* Bloco de Valor em Destaque */}
                    <View style={receiptStyles.amountContainer}>
                        <Text style={receiptStyles.amountLabel}>Valor Recebido</Text>
                        <Text style={receiptStyles.amountValue}>R$ {amount.toFixed(2).replace('.', ',')}</Text>
                    </View>

                    {/* Corpo do Texto Formal */}
                    <Text style={receiptStyles.textBody}>
                        Recebi de <Text style={receiptStyles.bold}>{patientName}</Text>, inscrito(a) no CPF sob o nº <Text style={receiptStyles.bold}>{patientCpf}</Text>, a importância de <Text style={receiptStyles.bold}>R$ {amount.toFixed(2).replace('.', ',')} ({amountInWords})</Text>, referente a serviços de atendimento psicológico ({session.sessionType}) realizado em <Text style={receiptStyles.bold}>{sessionDate}</Text>.
                    </Text>

                    <Text style={receiptStyles.textBody}>
                        Para maior clareza e por ser a expressão da verdade, firmo e assino o presente recibo.
                    </Text>

                    {/* Local e Data Automatizados */}
                    <Text style={receiptStyles.dateCity}>
                        Aracaju - SE, {today}.
                    </Text>
                </View>

                <DocSignature professional={professional} />

                <DocFooter professional={professional} />
            </Page>
        </Document>
    );
};
