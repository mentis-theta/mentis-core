import { LinterRule, LinterTarget, ValidationIssue, TipTapNode } from '../../types';

export class ValidityDeclarationRule implements LinterRule {
    public id = 'cfp-validity-declaration';
    public type = 'structural' as const;

    public validate(target: LinterTarget, context?: any): ValidationIssue[] | Promise<ValidationIssue[]> {
        // Regra aplicada apenas a documentos com prazo (Laudo, Relatório)
        if (context?.templateType !== 'laudo' && context?.templateType !== 'relatorio') {
            return [];
        }

        const issues: ValidationIssue[] = [];
        let hasValidityStatement = false;

        this.traverseAST(target.documentNodes, (node) => {
            if (node.type === 'paragraph' || node.type === 'heading') {
                const text = this.extractTextFromNode(node);
                // Busca variações comuns de declaração de validade
                if (/(?:validade|válido)\s*(?:de|por)?\s*\d+\s*(?:dias|meses|anos)/i.test(text)) {
                    hasValidityStatement = true;
                }
            }
        });

        if (!hasValidityStatement) {
            issues.push({
                ruleId: this.id,
                severity: 'fatal',
                message: 'O documento não contém uma declaração explícita de validade temporal. Segundo o CFP, laudos e relatórios devem indicar o prazo de validade de suas conclusões.',
            });
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
