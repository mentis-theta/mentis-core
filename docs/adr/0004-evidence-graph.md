> **NOTA:** ADR elaborado posteriormente para registrar uma decisão histórica.

# ADR 0004: Evidence Graph

## Status
Aprovado

## Contexto
Necessidade de mitigar alucinações de LLM de texto livre.

## Decisão
Gerar estrutura JSON com array de `EvidenceNode`, forçando a separação explícita entre observação e inferência, com rastreabilidade (provenance).
