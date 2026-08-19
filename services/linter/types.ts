export interface TipTapNode {
    type: string;
    attrs?: Record<string, any>;
    content?: TipTapNode[];
    text?: string;
    marks?: any[];
}

export interface LinterTarget {
    rawText: string;
    documentNodes: TipTapNode; // Raiz da AST do TipTap
}

export interface ValidationIssue {
    ruleId: string;
    severity: 'fatal' | 'warning' | 'suggestion';
    message: string;
    location?: {
        nodeId?: string;
        path?: number[]; // Caminho para encontrar o nó na AST
        startIndex?: number;
        endIndex?: number;
    };
    suggestedReplacement?: string;
}

export interface LinterRule {
    id: string;
    type: 'structural' | 'clinical';
    validate(target: LinterTarget, context?: any): ValidationIssue[] | Promise<ValidationIssue[]>;
    getPromptInject?(): string; // Para regras clínicas injetarem no Batch do LLM
}
