> **NOTA:** ADR elaborado posteriormente para registrar uma decisão histórica.

# ADR 0003: Reasoning Layer Isolado

## Status
Aprovado

## Contexto
Interface gráfica travando durante o RAG.

## Decisão
Delegação do raciocínio para Supabase Edge Functions usando Edge Runtime, deixando a thread do frontend livre.
