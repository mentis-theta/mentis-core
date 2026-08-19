import { LinterRule, LinterTarget, ValidationIssue } from '../../types';

export class CausalityFilterRule implements LinterRule {
    public id = 'clinical-causality-filter';
    public type = 'clinical' as const;

    public validate(target: LinterTarget, context?: any): ValidationIssue[] | Promise<ValidationIssue[]> {
        // Clinical rules validate method is a no-op because PolicyEngine handles the batch LLM execution.
        return [];
    }

    public getPromptInject(): string {
        return `Busque por verbos e afirmações deterministas e categóricas de causalidade que não podem ser cientificamente provadas apenas com avaliação clínica (Ex: "O divórcio CAUSOU a depressão", "Isto COMPROVA que o paciente mente", "O trauma é o MOTIVO EXATO"). 
Se houver esse absolutismo, a severidade é 'warning'. Sugira substituições moderadas como "está associado a", "é compatível com", "sugere relação com". Se a afirmação for moderada, não marque como violação.`;
    }
}
