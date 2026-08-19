
import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import type { User, Patient } from '@/types';
import { styles, DocHeader, DocFooter, DocSignature } from './DocumentComponents';
import { formatDate, capitalizeName } from '@/utils/formatters';
import { parseISO, startOfDay } from 'date-fns';

export type DocumentType = 'atestado' | 'encaminhamento' | 'laudo' | 'relatorio' | 'declaracao';

export interface ClinicalDocumentData {
    // For Atestado
    date?: string;
    startTime?: string;
    endTime?: string;

    // For Encaminhamento
    referralTo?: string; // "Ao Dr. X"
    description?: string; // Main text body

    // For Laudo and Relatório (Structured)
    sections?: Record<string, string>;
}

interface ClinicalDocumentProps {
    type: DocumentType;
    data: ClinicalDocumentData;
    professional: User;
    patient: Patient;
    verificationCode?: string;
}

export const ClinicalDocument: React.FC<ClinicalDocumentProps> = ({ type, data, professional, patient, verificationCode }) => {

    const stripHtml = (html: string) => {
        if (!html) return '';
        return html.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n\n').replace(/<[^>]*>?/gm, '').replace(/\$o\(a\)\$/g, 'o(a)');
    };

    const getDocumentTitle = () => {
        if (type === 'atestado') {
            return 'Atestado Psicológico';
        }
        if (type === 'encaminhamento') return 'Encaminhamento';
        if (type === 'laudo') return 'Laudo Psicológico';
        if (type === 'relatorio') return 'Relatório Psicológico';
        if (type === 'declaracao') return 'Declaração de Comparecimento';
        return 'Documento Clínico';
    };

    const renderContent = () => {
        if (type === 'atestado') {
            return (
                <View>
                    <Text>
                        {stripHtml(data.description || '')}
                    </Text>
                </View>
            );
        }

        if (type === 'encaminhamento') {
            return (
                <View>
                    <Text style={{ marginBottom: 20 }}>
                        <Text style={styles.bold}>Para: </Text>{data.referralTo || '____________________'}
                    </Text>
                    <Text>
                        {stripHtml(data.description || '')}
                    </Text>
                </View>
            );
        }

        // For declaracao, render the description as-is
        if (type === 'declaracao') {
            return (
                <View>
                    <Text>
                        {stripHtml(data.description || '')}
                    </Text>
                    {data.startTime && data.endTime && (
                        <Text style={{ marginTop: 10 }}>
                            Horário do atendimento: {data.startTime} às {data.endTime}
                        </Text>
                    )}
                </View>
            );
        }

        // For laudo and relatorio (Structured)
        if ((type === 'laudo' || type === 'relatorio') && data.sections) {
            return (
                <View>
                    {Object.entries(data.sections).map(([title, content], index) => (
                        <View key={index} style={{ marginBottom: 15 }}>
                            <Text style={[styles.bold, { marginBottom: 5 }]}>
                                {title}
                            </Text>
                            <Text>
                                {stripHtml(content || '')}
                            </Text>
                        </View>
                    ))}
                </View>
            );
        }

        return null;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <DocHeader
                    professional={professional}
                    title="" // Title removed from header
                />

                <View style={styles.content}>
                    {/* Title moved to Body for "Letterhead" look */}
                    <Text style={[styles.title, { marginTop: 20 }]}>{getDocumentTitle().toUpperCase()}</Text>

                    {renderContent()}

                    <Text>{"\n\n"}</Text>
                    <Text>
                        Por ser verdade, firmo o presente.
                    </Text>
                </View>

                <DocSignature professional={professional} />

                <DocFooter professional={professional} verificationCode={verificationCode} />
            </Page>
        </Document>
    );
};
