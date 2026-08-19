# Como Contribuir para o Mentis

O Mentis adota práticas inspiradas em software regulado (clínico). Por isso, não aceitamos PRs que não tenham passado pelo nosso fluxo de governança de produto e arquitetura.

## Fluxo Obrigatório

1. **Issue**: Descreva o problema, o impacto e a solução pretendida.
2. **ADR (Architecture Decision Record)**: Se a mudança afetar arquitetura, modelo de dados ou RAG, proponha um ADR.
3. **Discussão & Aceite**: Aguarde a aprovação formal do Tech Lead no ADR ou Issue.
4. **Implementação**: Escreva o código sem desviar do escopo aprovado no ADR.
5. **PR & Code Review**: Submeta o Pull Request anexando o Issue e o ADR correspondente.
6. **Benchmark & Testes**: O PR só fará merge se o NDCG e demais testes mantiverem a qualidade.
7. **Documentação**: Atualize os documentos pertinentes (Traceability, Risk Register) antes de concluir.
