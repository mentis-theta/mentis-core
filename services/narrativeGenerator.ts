import { ClinicalReasoningState } from './reasoningEngine.ts';
import { AI_MODELS } from '../config/ai_models.ts';

/**
 * Narrative Generator
 * Responsável por traduzir o esqueleto lógico estrito em uma narrativa humana e clínica,
 * adicionando os avisos necessários de sistema de apoio.
 */
export async function generateClinicalNarrative(state: ClinicalReasoningState): Promise<string> {
  const prompt = `
Você é um assistente sênior de um psicólogo.
Com base EXCLUSIVAMENTE na seguinte estrutura de raciocínio clínico (Grafo de Evidências) extraída de manuais baseados em evidência, gere um relatório narrativo coeso.

INSTRUÇÕES ESTRITAS:
1. Mantenha um tom profissional, acolhedor e clínico.
2. POSTURA EPISTEMOLÓGICA (MUITO IMPORTANTE): O sistema NÃO SABE o que o paciente "tem". NUNCA use frases determinísticas como "O paciente possui [Risco/Transtorno]". Utilize SEMPRE linguagem de análise de dados, como: "As informações apresentadas no caso indicam a presença do risco de..." ou "Há suporte na literatura para a hipótese de...".
3. Cite expressamente os Riscos Identificados logo no início se houver indícios no relato.
4. Explique as hipóteses separando claramente a "Observação Literária" (Evidência) da "Inferência Clínica" (Hipótese).
5. Dê enorme destaque às "Contraevidências". Explique o que precisaria estar presente para confirmar a hipótese, mas não foi observado, focando em diagnóstico diferencial.
6. Inclua as Sugestões de Avaliação.
7. OBRIGATÓRIO: Inclua um aviso claro no rodapé de que esta é uma análise de suporte algorítmico (Confidence Score: ${(state.confidence_score * 100).toFixed(1)}%) baseada na literatura e não substitui o julgamento do profissional humano.

ESTRUTURA DE DADOS BRUTOS (JSON):
${JSON.stringify(state, null, 2)}
  `;

  const { supabase } = await import('./supabaseClient.ts');
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      action: 'generate_text',
      payload: {
        model: AI_MODELS.REASONING_TASKS,
        prompt: prompt
      }
    }
  });

  if (error) {
    console.error('[NarrativeGenerator] Erro ao invocar LLM:', error);
    return `[Erro do Sistema]\nNão foi possível gerar a narrativa clínica. Verifique os dados estruturados.\n\nConfiança de Resgate: ${(state.confidence_score * 100).toFixed(1)}%`;
  }

  return data.text || '[Resposta Vazia Retornada pelo Modelo]';
}
