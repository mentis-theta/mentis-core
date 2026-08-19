import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import type { User, Patient } from '@/types';
import { styles, DocHeader, DocFooter, DocSignature } from '../../Finance/DocumentComponents';

export interface StructuredReportDocumentData {
    sections?: Record<string, string>;
}

export interface StructuredReportDocumentProps {
    type: 'laudo' | 'relatorio';
    data: StructuredReportDocumentData;
    professional: User;
    patient: Patient;
    verificationCode?: string;
}

/**
 * Structured PDF for Laudo and Relatório Psicológico.
 * 
 * Replicates the premium HTML layout from the reference design:
 * - Document title with left purple border (h1 style)
 * - Section 1 (Identificação) rendered as a 2-column info-grid
 * - Remaining sections rendered with purple uppercase h2 titles
 * - Smart parsing: bullet points (• or - or * prefixed lines) rendered as lists
 * - Smart parsing: tables detected via pipe-separated rows (|col1|col2|col3|)
 * - Bold text via <strong>, <b>, or **markdown**
 */
export const StructuredReportDocument: React.FC<StructuredReportDocumentProps> = ({ type, data, professional, patient, verificationCode }) => {

    const stripHtml = (html: string) => {
        if (!html) return '';
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<li[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<\/?(ul|ol)[^>]*>/gi, '')
            .replace(/<\/?(?!(?:strong|b)\b)[a-z](?:[^>"']|"[^"]*"|'[^']*')*>/gim, '')
            .replace(/\$o\(a\)\$/g, 'o(a)');
    };

    const getDocumentTitle = () => {
        if (type === 'laudo') return 'Laudo Psicológico';
        if (type === 'relatorio') return 'Relatório Psicológico';
        return 'Documento Clínico';
    };

    /** 
     * Renders a single paragraph, splitting bold segments out as styled <Text>.
     */
    const renderRichText = (text: string, key: React.Key) => {
        const parts = text.split(/(<strong>.*?<\/strong>|<b>.*?<\/b>|\*\*.*?\*\*)/g);

        return (
            <Text key={key} style={styles.sectionBody}>
                {parts.map((part, i) => {
                    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                        return <Text key={i} style={styles.bold}>{part.slice(8, -9)}</Text>;
                    }
                    if (part.startsWith('<b>') && part.endsWith('</b>')) {
                        return <Text key={i} style={styles.bold}>{part.slice(3, -4)}</Text>;
                    }
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
                    }
                    return <Text key={i}>{part}</Text>;
                })}
            </Text>
        );
    };

    /**
     * Renders a bullet point line (detected by leading •, -, or * followed by space).
     */
    const renderBulletItem = (text: string, key: React.Key) => {
        // Remove the leading bullet character
        const cleanText = text.replace(/^[•\-\*]\s*/, '');
        const parts = cleanText.split(/(<strong>.*?<\/strong>|<b>.*?<\/b>|\*\*.*?\*\*)/g);

        return (
            <Text key={key} style={styles.bulletItem}>
                <Text>{'•  '}</Text>
                {parts.map((part, i) => {
                    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                        return <Text key={i} style={styles.bold}>{part.slice(8, -9)}</Text>;
                    }
                    if (part.startsWith('<b>') && part.endsWith('</b>')) {
                        return <Text key={i} style={styles.bold}>{part.slice(3, -4)}</Text>;
                    }
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
                    }
                    return <Text key={i}>{part}</Text>;
                })}
            </Text>
        );
    };

    /**
     * Detects if a line is a bullet point.
     */
    const isBulletLine = (line: string) => /^[•\-\*]\s/.test(line.trim());

    /**
     * Renders the Identification section (Section 1) as a structured info-grid,
     * matching the reference HTML layout.
     */
    const renderIdentificationSection = (content: string) => {
        const cleanContent = stripHtml(content);
        const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);

        // Parse key-value pairs from the identification text
        const fields: { label: string; value: string }[] = [];
        let finalityText = '';
        let isFinalityBlock = false;

        for (const line of lines) {
            if (line.toLowerCase().startsWith('finalidade:') || line.toLowerCase().startsWith('finalidade :')) {
                isFinalityBlock = true;
                finalityText = line.replace(/^finalidade\s*:\s*/i, '').trim();
                continue;
            }
            if (isFinalityBlock) {
                finalityText += ' ' + line;
                continue;
            }

            // Try to parse "Label: Value" pattern
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0 && colonIndex < 40) {
                const label = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                if (label && value) {
                    fields.push({ label, value });
                }
            }
        }

        return (
            <View style={{ marginBottom: 15 }}>
                {/* Grid com campos de identificação */}
                {fields.length > 0 && (
                    <View style={styles.identificationGrid}>
                        {fields.map((field, i) => (
                            <View key={i} style={styles.identificationCell}>
                                <Text>
                                    <Text style={styles.identificationLabel}>{field.label}: </Text>
                                    <Text style={styles.identificationValue}>{field.value}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Finalidade como parágrafo separado */}
                {finalityText && (
                    <Text style={styles.finalityBlock}>
                        <Text style={styles.identificationLabel}>Finalidade: </Text>
                        <Text>{finalityText}</Text>
                    </Text>
                )}
            </View>
        );
    };

    /**
     * Renders a generic section body: paragraphs, bullet lists, and tables.
     */
    const renderSectionContent = (title: string, content: string) => {
        const cleanContent = stripHtml(content);
        const lines = cleanContent.split('\n');
        const elements: React.ReactNode[] = [];
        let paragraphBuffer = '';
        let elementKey = 0;

        const flushParagraph = () => {
            if (paragraphBuffer.trim()) {
                elements.push(renderRichText(paragraphBuffer.trim(), elementKey++));
                paragraphBuffer = '';
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim() === '') {
                flushParagraph();
                continue;
            }

            if (isBulletLine(line)) {
                flushParagraph();
                elements.push(renderBulletItem(line.trim(), elementKey++));
                continue;
            }

            // Accumulate regular text into paragraph
            if (paragraphBuffer) {
                paragraphBuffer += ' ' + line.trim();
            } else {
                paragraphBuffer = line.trim();
            }
        }

        flushParagraph();

        if (elements.length === 0) {
            return (
                <View wrap={false} style={{ marginBottom: 4 }}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
            );
        }

        const firstElement = elements[0];
        const restElements = elements.slice(1);

        return (
            <View wrap={true}>
                {/* Título + Primeiro parágrafo blindados juntos contra quebra de página */}
                <View wrap={false} style={{ marginBottom: 4 }}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    {firstElement}
                </View>

                {/* Restante dos elementos com quebra natural (mas impedindo órfãs/viúvas por linha) */}
                {restElements.map((el, idx) => (
                    <View key={idx} wrap={false} style={{ marginBottom: 4 }}>
                        {el}
                    </View>
                ))}
            </View>
        );
    };

    /**
     * Checks if a section key corresponds to the Identification section.
     */
    const isIdentificationSection = (sectionKey: string) => {
        return sectionKey.toLowerCase().includes('identifica');
    };

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>
                <DocHeader professional={professional} title="" />

                <View style={styles.content}>
                    {/* Document Title - with left purple border like the reference h1 */}
                    <Text style={styles.documentTitle}>
                        {getDocumentTitle().toUpperCase()}
                    </Text>

                    {/* Sections */}
                    {data.sections && Object.entries(data.sections).map(([title, content], index) => {
                        return (
                            <View key={index} style={{ marginBottom: 5 }} wrap={true}>
                                {isIdentificationSection(title)
                                    ? (
                                        <View wrap={false}>
                                            <Text style={styles.sectionTitle}>{title}</Text>
                                            {renderIdentificationSection(content)}
                                        </View>
                                    )
                                    : renderSectionContent(title, content)
                                }
                            </View>
                        );
                    })}

                    {/* Closing statement */}
                    <Text style={{ marginTop: 15, fontSize: 12, lineHeight: 1.6 }}>
                        Por ser verdade, firmo o presente.
                    </Text>
                </View>

                <DocSignature professional={professional} />
                <DocFooter professional={professional} verificationCode={verificationCode} />
            </Page>
        </Document>
    );
};
