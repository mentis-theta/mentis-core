import { LinterRule, LinterTarget, ValidationIssue } from '../../types';

export class SpeculationFilterRule implements LinterRule {
    public id = 'clinical-speculation-filter';
    public type = 'clinical' as const;

    public validate(target: LinterTarget, context?: any): ValidationIssue[] | Promise<ValidationIssue[]> {
        // Clinical rules validate method is a no-op because PolicyEngine handles the batch LLM execution.
        return [];
    }

    public getPromptInject(): string {
        return `Avalie saltos lógicos e especulações. Busque por inferências ou conclusões feitas pelo profissional sobre fatos externos, intenções de terceiros ou eventos que não puderam ser verificados em consultório (Ex: "A mãe da paciente claramente manipulou a situação", "O acidente ocorreu devido à negligência do chefe", "O paciente será incapaz de trabalhar para sempre").
Se encontrar suposições não comprováveis clinicamente ou previsões absolutas de longo prazo, a severidade é 'warning'. Peça para restringir a análise aos dados coletados e observáveis.`;
    }
}
