# ADR-003: Imutabilidade das Observações Clínicas

## Status
Aceito

## Contexto
Fatos clínicos frequentemente evoluem com o tempo (ex: Ansiedade Severa -> Ansiedade Moderada). Em bancos de dados tradicionais, a tentação é aplicar um UPDATE (mutação) no registro do paciente. Porém, na área forense e psiquiátrica (CFP), modificar um dado histórico apaga a proveniência clínica e invalida o prontuário como documento rastreável.

## Decisão
1. Toda `ClinicalObservation` é imutável. Uma vez inserida e "approved", ela jamais sofrerá UPDATEs em seu conteúdo central.
2. A evolução clínica é gerenciada associando múltiplas observações ao longo do tempo a um único `PatientConcept` (a entidade representativa).
3. Correções ou atualizações geram uma NOVA observação que, via middleware, atualiza o status de visibilidade ou resolve conflitos com a anterior, preservando integralmente o histórico da decisão.
