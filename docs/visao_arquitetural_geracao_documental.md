# Documento de Visão Arquitetural: Módulo de Geração Documental (HITL)

## 1. Introdução e Paradigma
Este documento define a arquitetura do **Módulo de Geração Documental Assistida** do Mentis. Afastando-se dos modelos tradicionais de "caixa-preta", o sistema adota a arquitetura **Human-in-the-Loop (HITL) em Linha de Montagem**. O objetivo é garantir que o psicólogo tenha soberania total sobre o raciocínio, utilizando a IA como um copiloto estrutural, garantindo precisão pericial e adesão rigorosa à Resolução CFP nº 06/2019.

## 2. A Arquitetura da "Linha de Montagem"
O processo abandona a geração monolítica (*one-shot*) em favor de um fluxo fragmentado e auditável, operando em três estações isoladas e um motor de validação assíncrona.

### 2.1. Estação 1: Régua de Escopo (Controle de Insumos)
- **Responsabilidade:** Controle de contexto. Garante que informações sigilosas ou irrelevantes não contaminem a geração.
- **Mecânica:** O frontend apresenta um modal (com os resumos curtos das sessões). O profissional realiza uma seleção explícita (via checkboxes) das sessões e pontos da anamnese que devem compor a matéria-prima do documento.
- **Benefício:** Impede vazamento de escopo (ex: inserir detalhes traumáticos não pertinentes em um atestado simples).

### 2.2. Estação 2: Mesa de Triagem (Aprovação de Fatos)
- **Responsabilidade:** Extração de dados puros sem a redação do laudo. Elimina a abstração da IA.
- **Mecânica:** A API processa as sessões selecionadas e retorna apenas **Fatos Clínicos** (ex: Sintomas, Intervenções, Relatos) listados como *tags* ou tópicos rápidos. O psicólogo atua como curador da base probatória, marcando o que entra e desmarcando o que fica de fora.
- **Protocolo de Retorno:** O LLM devolve um objeto JSON mapeado para componentes React de triagem visual, antes de qualquer redação de parágrafo.

### 2.3. Estação 3: Impressora Modular (Edição Cirúrgica / Micro-RAG)
- **Responsabilidade:** Geração do texto final e mitigação completa do "Efeito Dominó".
- **Mecânica:** A redação ocorre em "blocos de Lego" isolados, pré-configurados pela estrutura técnica exigida pelo documento (ex: Identificação, Avaliação, Conclusão). Se o psicólogo solicitar uma alteração (ex: "refinar o tom deste parágrafo"), o acionamento via **Micro-RAG** afeta *apenas* aquele bloco. 
- **Benefício:** Os demais blocos já revisados e aprovados ficam blindados e imutáveis.

## 3. Motor de Auditoria Global (Linter Clínico)
A última camada de segurança antes da exportação do PDF, desenhada para detectar inconsistências lógicas passadas despercebidas durante a montagem por blocos.

- **Gatilho:** Acionamento manual via botão "Verificar Coerência" na barra de ferramentas.
- **Shadow Sync:** O sistema tira um *snapshot* (fotografia) de todos os blocos redigidos e os envia ao LLM com uma instrução estrita de atuar como **Perito Revisor** (e não escritor).
- **Resolução (JSON):** O LLM avalia a coesão lógica (ex: causa e consequência). Se apontado um risco de auto-lesão na *Análise*, ele exige que isso seja abordado na *Conclusão*.
- **UX de Correção:** O sistema não reescreve o texto sozinho. Ele acende um alerta visual no bloco problemático e exibe um *mini-diff* (antes/depois). O psicólogo mantém o poder absoluto de aceitar a sugestão ou ignorá-la.

## 4. Requisitos Não-Funcionais e Impacto na UX
- **Carga Cognitiva:** Embora adicione passos iniciais de "opt-in" (fricção intencional para segurança), reduz a extenuante leitura corretiva do final do processo.
- **Persistência Temporária:** Utilização do `Supabase` para salvar os *drafts* (rascunhos) por bloco e estado das Estações, evitando perda de progresso durante interrupções na clínica.
- **Desempenho:** Chamadas fracionadas (micro-RAG) exigem payloads menores, acelerando o tempo de resposta da API do Gemini.

## 5. Conclusão e Impacto no Produto
Esta implementação eleva o Mentis a um patamar único. Ao invés de lutar contra as alucinações de uma IA generalista, orquestramos o processamento algorítmico dentro dos trilhos éticos da Psicologia. A plataforma passa a oferecer um motor de laudos de alta precisão que reduz o tempo de elaboração drasticamente, sem sacrificar um milímetro de controle sobre a história clínica do paciente.

## 6. Roadmap de Implementação (Evolução de IA)
A estratégia de engenharia adotada segue o modelo de entrega de valor iterativo, dividida em duas fases principais para mitigar riscos arquiteturais e garantir validação técnica.

### Fase 1: Módulo HITL e Persistência Local (Foco Imediato)
- **Objetivo:** Lançar a Linha de Montagem de Documentos de forma isolada para resolver a dor imediata do profissional (laudos auditáveis).
- **Dados:** Os *Fatos Clínicos* e os resumos gerados são salvos no banco de dados apenas em caráter transitório (rascunhos vinculados ao documento atual). 
- **Benefício:** Permite validar na prática a usabilidade (fricção da triagem) e consolidar o formato (schema JSON) ideal exigido pelas estruturas periciais antes de escalar a arquitetura.

### Fase 2: Agregador de Memória Clínica (Escala e Economia)
- **Objetivo:** Criar o "Cérebro Central" (Patient Knowledge Graph) reutilizando o motor de extração construído na Fase 1.
- **Mecânica:** Os Fatos Clínicos extraídos e validados na Estação 2 deixam de ser descartáveis. Eles passam a ser indexados em uma tabela global do paciente (`patient_ai_memory`).
- **Benefício de Produto:** Inicia a era de economia brutal de tokens. Funcionalidades futuras (Chatbot Clínico, Sugestão de Tratamento) não precisarão reprocessar o texto longo e bruto de todas as sessões. A IA consultará o Agregador de Memória já curado e estruturado, ganhando extrema velocidade e eficiência financeira na API do LLM.
