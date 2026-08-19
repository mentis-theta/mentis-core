# Princípios de Arquitetura (Architecture Principles)

Qualquer código ou proposta de IA incorporada ao Mentis DEVE obedecer aos seguintes princípios inegociáveis:

1. **Explainability First**: O psicólogo sempre precisa saber *como* o sistema chegou àquela conclusão. Caixas pretas estritas são rejeitadas.
2. **Evidence Before Narrative**: O Grafo de Evidências precede e dita a Síntese Narrativa, e não o contrário.
3. **No Silent Reasoning**: Se o LLM usou uma inferência ou detectou uma contradição, ela deve estar explícita na UI.
4. **Force Retrieval for Critical Risk**: A predição deve forçar ativamente a busca no banco vetorial por critérios de exclusão ou riscos críticos (falseabilidade).
5. **No Diagnostic Statements**: O Mentis não faz diagnósticos ("O paciente tem X"). Ele levanta hipóteses baseadas em critérios ("Os sintomas batem com os critérios B e C de X").
6. **Human-in-the-loop**: O sistema requer ação do usuário para incorporar dados ao prontuário.
7. **Deterministic Before Probabilistic**: Se há uma regra ou fluxo que pode ser resolvida com código determinístico (ex: cálculos clássicos, regras rígidas de fluxograma), use-o em vez de gastar tokens probabilísticos do LLM.
8. **Every Clinical Claim Must Be Traceable**: Toda afirmação clínica na plataforma precisa estar amarrada à sua fonte primária ou a um `chunk_id` da base validada.
