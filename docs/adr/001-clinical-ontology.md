# ADR-001: Ontologia Clínica

## Status
Aceito

## Contexto
Pacientes e psicólogos utilizam linguagem natural livre, que varia imensamente. Se permitirmos que o LLM defina as categorias diagnósticas e de sintomas dinamicamente, o sistema perderá a capacidade de rastreabilidade, filtros estruturados e auditoria forense. Termos como "ansioso", "nervoso" e "angustiado" gerariam chaves distintas no banco de dados.

## Decisão
Adotamos um Vocabulário Controlado (Ontologia) com identificadores fixos. O sistema terá uma biblioteca determinística `ClinicalOntology` que mapeia termos e aliases para um identificador único no padrão `<domínio>.<conceito>` (ex: `mood.anxiety` -> ID `SYM-0001`).

### Diretrizes
1. O LLM **nunca** gera IDs (UUIDs). Ele deve sugerir o termo em texto.
2. A resolução do termo sugerido pela IA para o `ConceptID` permanente é feita pelo `ontologyResolver.ts`.
3. Novos conceitos não previstos na ontologia devem ser classificados como `unknown` e encaminhados para curadoria técnica. A IA não tem permissão para expandir a ontologia dinamicamente.
