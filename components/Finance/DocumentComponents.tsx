import React from 'react';
import { Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import type { User } from '@/types';

// Register a specific Serif font explicitly for the Psi (Ψ) icon containing only that glyph
Font.register({
    family: 'PsiIconFont',
    src: 'https://fonts.gstatic.com/l/font?kit=SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUA514vQU&skey=fde9b303600e495b&v=v32'
});

// Premium Color Palette
const colors = {
    primary: '#4A148C',   // mentis-purple
    accent: '#7B1FA2',    // mentis-accent
    light: '#F3E5F5',     // mentis-light
    textMain: '#333333',
    textMuted: '#666666',
    border: '#4A148C',
    borderLight: '#e0e0e0',
};

export const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        paddingTop: 40,
        paddingLeft: 50,
        paddingRight: 50,
        paddingBottom: 80, // Space for sticky footer
        fontSize: 11,
        lineHeight: 1.6,
        fontFamily: 'Helvetica',
        color: colors.textMain,
    },
    // Header: Split Layout (Logo Left | Info Right)
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 40,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        paddingBottom: 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
    },
    headerRight: {
        width: '50%',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        paddingBottom: 5,
    },
    logo: {
        width: 70,
        height: 70,
        objectFit: 'contain',
    },
    brandIcon: {
        fontSize: 40,
        color: colors.primary,
        fontFamily: 'PsiIconFont',
        marginRight: 12,
    },
    brandTextGroup: {
        flexDirection: 'column',
    },
    brandText: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    brandSub: {
        fontSize: 9,
        color: colors.accent,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.5,
    },
    profName: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    profTitle: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    profCrp: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 2,
    },
    // Content Body
    title: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.primary,
    },
    content: {
        marginBottom: 40,
        textAlign: 'justify',
        lineHeight: 1.6,
        fontSize: 12,
        color: colors.textMain,
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
        fontWeight: 'bold',
        color: colors.primary,
    },
    // Footer: Sticky Bottom
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 50,
        right: 50,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: 15,
    },
    footerText: {
        fontSize: 9,
        color: '#999999',
        marginBottom: 3,
    },
    verificationScale: {
        fontSize: 8,
        color: '#999999',
        marginTop: 5,
    },
    // Signature Section
    signatureSection: {
        marginTop: 40, 
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    signatureLine: {
        width: 250,
        borderTopWidth: 1,
        borderTopColor: colors.textMain,
        marginTop: 10,
        marginBottom: 5,
    },
    signatureImage: {
        width: 180,
        height: 70,
        objectFit: 'contain',
        marginBottom: -10, // Overlap line slightly for realism
    },
    signatureDraw: {
        fontFamily: 'Times-Italic',
        fontSize: 26,
        color: colors.primary,
        marginBottom: 5,
    },
    // === Structured Report Styles (Laudo / Relatório) ===
    documentTitle: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        textTransform: 'uppercase' as const,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        paddingLeft: 10,
        letterSpacing: 1,
    },
    identificationGrid: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderColor: '#eeeeee',
        borderRadius: 6,
        padding: 12,
        marginBottom: 15,
    },
    identificationCell: {
        width: '50%' as const,
        paddingVertical: 4,
        paddingHorizontal: 4,
        fontSize: 11,
        color: colors.textMain,
    },
    identificationLabel: {
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        fontSize: 10,
    },
    identificationValue: {
        fontSize: 11,
        color: colors.textMain,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        textTransform: 'uppercase' as const,
        marginTop: 18,
        marginBottom: 10,
    },
    sectionBody: {
        fontSize: 12,
        color: colors.textMain,
        lineHeight: 1.6,
        textAlign: 'justify' as const,
        marginBottom: 12,
    },
    bulletItem: {
        fontSize: 12,
        color: colors.textMain,
        lineHeight: 1.6,
        marginBottom: 4,
        paddingLeft: 15,
    },
    tableHeader: {
        flexDirection: 'row' as const,
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    tableHeaderCell: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
    },
    tableRow: {
        flexDirection: 'row' as const,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    tableCell: {
        fontSize: 11,
        color: colors.textMain,
    },
    finalityBlock: {
        fontSize: 12,
        color: colors.textMain,
        lineHeight: 1.6,
        textAlign: 'justify' as const,
        marginBottom: 15,
    },
});

interface DocHeaderProps {
    professional: User;
    title: string; // Document Title (Passed but not used in Header anymore used in Body)
    subtitle?: string; // Kept for interface compatibility
}

export const DocHeader: React.FC<DocHeaderProps> = ({ professional }) => {
    const profName = professional.name || 'PROFISSIONAL';
    const clinicName = professional.clinicName;
    const initials = (clinicName || profName).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const profCrp = professional.crp || professional.councilNumber || 'N/A';
    const specialty = professional.specialty || 'Psicologia Clínica';

    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {professional.logoUrl ? (
                    <Image src={professional.logoUrl} style={styles.logo} />
                ) : (
                    <>
                        <Text style={styles.brandIcon}>Ψ</Text>
                        <View style={styles.brandTextGroup}>
                            <Text style={styles.brandText}>{clinicName || 'Mentis'}</Text>
                            <Text style={styles.brandSub}>Psicologia Clínica Baseada em Evidências</Text>
                        </View>
                    </>
                )}
            </View>
            <View style={styles.headerRight}>
                {clinicName ? (
                    <>
                        <Text style={styles.profName}>{clinicName.toUpperCase()}</Text>
                        <Text style={styles.profTitle}>{profName} - {specialty}</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.profName}>{profName.toUpperCase()}</Text>
                        <Text style={styles.profTitle}>{specialty}</Text>
                    </>
                )}
                <Text style={styles.profCrp}>CRP: {profCrp}</Text>
            </View>
        </View>
    );
};

interface DocFooterProps {
    professional: User;
    city?: string;
    verificationCode?: string;
}

export const DocFooter: React.FC<DocFooterProps> = ({ professional, city, verificationCode }) => {
    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Dynamic city fallback logic
    const displayCity = city || professional.city || 'Localidade';

    const profAddress = professional.addressFull || `${professional.city || ''} - ${professional.state || ''}`;
    const profContact = [professional.phone, professional.email].filter(Boolean).join(' | ');

    // Gerar iniciais para a Rubrica
    const profName = professional.name || 'PROFISSIONAL';
    const initials = profName.split(' ').filter(n => n.length > 2).map(n => n[0]).join('').slice(0, 3).toUpperCase();

    return (
        <View style={styles.footer} fixed>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
                {displayCity}, {today}.
            </Text>

            <Text style={styles.footerText}>
                {[profAddress, profContact].filter(text => text && text.length > 5).join(' | ')}
            </Text>

            {verificationCode && (
                <Text style={styles.verificationScale}>
                    Autenticidade Digital: {verificationCode}
                </Text>
            )}
            <Text style={styles.verificationScale}>Documento gerado eletronicamente via Mentis.</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                {/* Rubrica on all pages EXCEPT last */}
                <Text style={styles.verificationScale} render={({ pageNumber, totalPages }) => (
                    pageNumber !== totalPages ? `Rubrica: _________________ (${initials})` : ''
                )} />

                {/* Page Numbering */}
                <Text style={styles.verificationScale} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages}`
                )} />
            </View>
        </View>
    );
};

interface DocSignatureProps {
    professional: User;
}

export const DocSignature: React.FC<DocSignatureProps> = ({ professional }) => {
    const profName = professional.name || 'Psicólogo(a)';
    const profCrp = professional.crp || professional.councilNumber || 'N/A';

    return (
        <View style={styles.signatureSection}>
            {professional.signatureUrl ? (
                <Image src={professional.signatureUrl} style={styles.signatureImage} />
            ) : (
                <Text style={styles.signatureDraw}>{profName}</Text>
            )}

            <View style={styles.signatureLine} />
            <Text style={styles.profName}>{profName}</Text>
            <Text style={styles.profTitle}>Psicólogo(a) - CRP {profCrp}</Text>
            {professional.cpf && <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>CPF: {professional.cpf}</Text>}
        </View>
    );
};
