import { LinterRule, LinterTarget, ValidationIssue, TipTapNode } from '../../types';

export class MandatorySectionsRule implements LinterRule {
    public id = 'cfp-mandatory-sections';
    public type = 'structural' as const;

    // Regras do CFP para Laudo Psicológico
    private readonly requiredSections = [
        { key: 'identificacao', label: '1. IDENTIFICAÇÃO', regex: /1\.?\s*IDENTIFICA[CÇ][AÃ]O/i },
        { key: 'demanda', label: 'DESCRIÇÃO DA DEMANDA', regex: /(?:2\.?\s*)?DESCRI[CÇ][AÃ]O DA DEMANDA/i },
        { key: 'procedimento', label: 'PROCEDIMENTO', regex: /(?:3\.?\s*)?PROCEDIMENTOS?/i },
        { key: 'analise', label: 'ANÁLISE', regex: /(?:4\.?\s*)?AN[AÁ]LISE/i },
        { key: 'conclusao', label: 'CONCLUSÃO', regex: /(?:5\.?\s*)?CONCLUS[AÃ]O/i }
    ];

    public validate(target: LinterTarget, context?: any): ValidationIssue[] | Promise<ValidationIssue[]> {
        // Apenas aplica a regra estrutural complexa se o tipo for Laudo ou Relatório (estruturado)
        if (context?.templateType !== 'laudo' && context?.templateType !== 'relatorio') {
            return [];
        }

        const issues: ValidationIssue[] = [];
        const foundSections = new Set<string>();

        // Percorrer a AST para extrair texto de blocos e verificar se contêm os headers
        this.traverseAST(target.documentNodes, (node) => {
            // Se for um bloco (heading ou paragraph), junta os textos dos filhos
            if (node.type === 'heading' || node.type === 'paragraph') {
                const blockText = this.extractTextFromNode(node);
                
                this.requiredSections.forEach(section => {
                    if (section.regex.test(blockText)) {
                        foundSections.add(section.key);
                    }
                });
            }
        });

        // Verifica quais faltaram
        for (const section of this.requiredSections) {
            if (!foundSections.has(section.key)) {
                issues.push({
                    ruleId: this.id,
                    severity: 'fatal',
                    message: `Seção obrigatória ausente: ${section.label}. Segundo o CFP, o Laudo/Relatório precisa conter esta seção explícita.`,
                });
            }
        }

        return issues;
    }

    private extractTextFromNode(node: TipTapNode): string {
        let text = node.text || '';
        if (node.content) {
            for (const child of node.content) {
                text += this.extractTextFromNode(child);
            }
        }
        return text;
    }

    private traverseAST(node: TipTapNode, callback: (n: TipTapNode) => void) {
        callback(node);
        if (node.content) {
            node.content.forEach((child: TipTapNode) => this.traverseAST(child, callback));
        }
    }
}
