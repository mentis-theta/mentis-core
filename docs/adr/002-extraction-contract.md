# ADR-002: Contrato de Extração (ExtractionResult)

## Status
Aceito

## Contexto
Se o motor de IA (ex: LLM) e as camadas subsequentes (Middleware, Linter, Renderização Documental) não possuírem um limite estrito, o sistema sofrerá de forte acoplamento estrutural ("God Object"). O Extrator passará a decidir estrutura documental e regras de negócio, impossibilitando a testabilidade unitária e a troca transparente de provedores de IA (de Gemini para GPT-5, por exemplo).

## Decisão
Fica instituído que toda extração textual inicial passará OBRIGATORIAMENTE pelo contrato tipado `ExtractionResult`. 
Nenhuma camada posterior (normalizadores, linters ou geradores) consumirá texto bruto, mas apenas a saída estruturada do `ExtractionResult`.

### Diretrizes
1. O Extrator é estritamente um mecanismo de extração, não de inferência lógica, sumarização narrativa ou formatação documental.
2. O contrato carrega metadados (`ExtractionMetadata`) como versão da ontologia, versão do modelo LLM e duração, essenciais para auditoria.
3. Se houver falha de mapeamento (ex: alucinação de diagnósticos que não pertencem ao contexto clínico), esses itens são isolados em arrays de erro/alerta (`unknownConcepts`, `warnings`) ao invés de poluírem as observações válidas.
