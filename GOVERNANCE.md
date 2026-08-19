# Governança e Tomada de Decisão (V6+)

O projeto Mentis segue um framework restrito para garantir rastreabilidade em decisões clínicas e de engenharia.

## Processo de Decisão

A cadeia de aprovação de qualquer novidade segue a ordem estrita:

`Requisito → ADR → Issue → Implementação → Teste → Benchmark → Validação Clínica`

Nenhum desenvolvedor ou IA deve empurrar implementações de escopo ("scaffolds estruturais" ou "código de produção") sem antes aprovar um *Architecture Decision Record* (ADR) associado a uma Issue.

## Separação de Checklists

O processo de revisão no Mentis separa explicitamente a Engenharia da Pesquisa:

**Checklist de Engenharia:**
- ADR
- Testes
- Benchmark
- Docs
- Risk Register

**Checklist de Pesquisa:**
- Aprovação ética
- Protocolo
- Dataset
- Análise estatística
- Resultados
- Limitações
