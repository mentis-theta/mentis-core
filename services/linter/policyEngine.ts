import { LinterRule, LinterTarget, ValidationIssue, TipTapNode } from './types';
import { callGeminiAPI, parseLLMJSON } from '@/utils/aiUtils';

export class PolicyEngine {
    private rules: LinterRule[] = [];

    public registerRule(rule: LinterRule) {
        this.rules.push(rule);
    }

    public registerRules(rules: LinterRule[]) {
        this.rules.push(...rules);
    }

    public async evaluate(target: LinterTarget, context?: any): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        // ----------------------------------------------------
        // STAGE 1: Structural Rules (Synchronous, Fail-Fast)
        // ----------------------------------------------------
        const structuralRules = this.rules.filter(r => r.type === 'structural');
        
        for (const rule of structuralRules) {
            const ruleIssues = await rule.validate(target, context);
            issues.push(...ruleIssues);

            // Fail-Fast: Se encontrou erro fatal estrutural, aborta e não gasta LLM.
            if (ruleIssues.some(i => i.severity === 'fatal')) {
                console.warn(`[PolicyEngine] Curto-circuito disparado pela regra estrutural: ${rule.id}`);
                return issues;
            }
        }

        // ----------------------------------------------------
        // STAGE 2: Clinical Rules (Asynchronous, Batch LLM)
        // ----------------------------------------------------
        const clinicalRules = this.rules.filter(r => r.type === 'clinical' && r.getPromptInject);
        
        if (clinicalRules.length > 0) {
            const clinicalIssues = await this.evaluateClinicalBatch(clinicalRules, target, context);
            issues.push(...clinicalIssues);
        }

        return issues;
    }

    private async evaluateClinicalBatch(
        rules: LinterRule[], 
        target: LinterTarget,
        context?: any
    ): Promise<ValidationIssue[]> {
        
        // 1. Montar os "injects" das regras em um único mega-prompt
        const injects = rules.map(r => `Regra [${r.id}]: ${r.getPromptInject!()}`).join('\n');

        const systemPrompt = `
Você é o Linter Clínico Oficial do Mentis (Motor de Conformidade CFP e Ética).
Sua missão é ler o rascunho de um documento clínico abaixo e avaliá-lo exclusivamente sob as seguintes regras:

${injects}

INSTRUÇÕES:
Devolva UM ÚNICO ARRAY JSON. Se não houver violações, retorne [].
Para cada violação encontrada, crie um objeto no formato:
{
    "ruleId": "ID_DA_REGRA_VIOLADA_AQUI",
    "severity": "fatal" | "warning" | "suggestion",
    "message": "Explicação clínica e objetiva do porquê violou",
    "exactTextMatched": "TRECHO_EXATO_DO_TEXTO_COM_PROBLEMA",
    "suggestedReplacement": "SUGESTÃO_DE_TEXTO_CORRIGIDO"
}

RASCUNHO DO DOCUMENTO:
"""
${target.rawText}
"""

Retorne apenas o array JSON puro, sem formatação markdown ou texto extra.
`;

        try {
            const { text } = await callGeminiAPI(systemPrompt, true);
            const llmResponses = parseLLMJSON<any[]>(text);

            if (!llmResponses || !Array.isArray(llmResponses)) {
                return [];
            }

            // 2. Mapear as respostas do LLM para ValidationIssues reais, procurando o nó na AST do TipTap
            const clinicalIssues: ValidationIssue[] = [];

            for (const resp of llmResponses) {
                const issue: ValidationIssue = {
                    ruleId: resp.ruleId,
                    severity: resp.severity || 'warning',
                    message: resp.message,
                    suggestedReplacement: resp.suggestedReplacement,
                };

                // AST Resolution: DFS (Busca em Profundidade) com Fuzzy Matching
                if (resp.exactTextMatched && target.documentNodes) {
                    const match = findNodePathDFS(target.documentNodes, resp.exactTextMatched);
                    if (match) {
                        issue.location = {
                            path: match.path,
                            startIndex: match.startIndex,
                            endIndex: match.startIndex + resp.exactTextMatched.length
                        };
                    } else {
                        // Fallback para o texto bruto se não achar na AST (ex: texto fragmentado entre nós)
                        const rawNormalized = normalizeText(target.rawText);
                        const exactNormalized = normalizeText(resp.exactTextMatched);
                        const rawStartIndex = rawNormalized.indexOf(exactNormalized);
                        if (rawStartIndex !== -1) {
                            issue.location = { startIndex: rawStartIndex, endIndex: rawStartIndex + exactNormalized.length };
                        }
                    }
                }

                clinicalIssues.push(issue);
            }

            return clinicalIssues;

        } catch (err) {
            console.error('[PolicyEngine] Erro ao processar Batch Clínico:', err);
            // Em caso de falha da IA, retornamos aviso sistêmico
            return [{
                ruleId: 'engine_failure',
                severity: 'warning',
                message: 'O motor de análise semântica falhou ou excedeu o limite de processamento.'
            }];
        }
    }
}

/**
 * Normaliza o texto removendo pontuação extra, espaços duplos e ignorando capitalização.
 * Usado para tornar a DFS imune a "soluços" do LLM (Fuzzy Matching).
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[.,;!?]/g, '') // Ignora pontuação leve
        .replace(/\s+/g, ' ')    // Reduz múltiplos espaços a um só
        .trim();
}

/**
 * Constrói uma expressão regular que permite espaços e pontuação flexíveis
 * entre as palavras buscadas, garantindo um `startIndex` preciso na string original.
 */
function buildFuzzyRegex(searchText: string): RegExp {
    const words = searchText.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Permite qualquer quantidade de espaço ou pontuação leve entre as palavras
    return new RegExp(words.join('[\\s.,;!?]*'), 'i');
}

/**
 * DFS (Busca em Profundidade) na Árvore Sintática do TipTap.
 * Retorna o caminho exato de índices para o componente de UI fazer o Highlight.
 */
function findNodePathDFS(
    node: TipTapNode, 
    searchText: string, 
    currentPath: number[] = []
): { path: number[], startIndex: number, text: string } | null {
    if (node.type === 'text' && node.text) {
        const fuzzyRegex = buildFuzzyRegex(searchText);
        const match = node.text.match(fuzzyRegex);

        if (match && match.index !== undefined) {
            return {
                path: currentPath,
                startIndex: match.index, // Index real garantido pela RegExp no texto original
                text: node.text
            };
        }
    }

    if (node.content && Array.isArray(node.content)) {
        for (let i = 0; i < node.content.length; i++) {
            const childNode = node.content[i];
            const match = findNodePathDFS(childNode, searchText, [...currentPath, i]);
            if (match) return match;
        }
    }

    return null;
}

export const policyEngine = new PolicyEngine();
