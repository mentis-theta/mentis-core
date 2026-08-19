# Documentação Técnica: Módulo de Geração de Documentos via Inteligência Artificial

## 1. Visão Geral
**Objetivo do Módulo:**  
O Módulo de Geração de Documentos com Inteligência Artificial do Mentis automatiza e padroniza a redação de relatórios, laudos, atestados e declarações clínicas. Seu objetivo é estruturar o raciocínio clínico bruto do psicólogo, transformando anotações de sessão em documentos formais e tecnicamente irretocáveis.

**Contexto de Uso:**  
Dentro da clínica, o psicólogo aciona o módulo através do `DocStation` na interface do paciente. Ao selecionar um documento estruturado, ele pode utilizar a funcionalidade "Preencher via IA" para que o sistema gere um rascunho sólido focado em finalidades específicas (ex: uso clínico padrão ou uso pericial/INSS).

**Benefícios Esperados:**  
- **Agilidade Operacional:** Redução drástica do tempo gasto na digitação de laudos.
- **Conformidade Legal:** Adesão nativa à Resolução CFP nº 06/2019 e às exigências de rigor pericial e neutralidade institucional.
- **Redução de Erros:** Estruturação lógica e mitigação de escrita com carga dramática/subjetiva não profissional.

---

## 2. Fluxo de Manipulação de Informações do Paciente
A IA do Mentis atua sob um RAG (Retrieval-Augmented Generation) dinâmico alimentado pelo próprio prontuário.

**Fontes de Dados (Coleta):**
- **Sessões (`session.notes`):** As últimas 5 evoluções clínicas cadastradas pelo profissional.
- **Anamnese (`anamnesis`):** Queixas principais, diagnósticos formulados, medicações em uso e histórico pregresso.
- **Dados Demográficos:** ID, Nome, Idade, CPF (provenientes do `PatientContext`).

**Validação e Limpeza:**
O frontend extrai o "plain text" de editores ricos (Rich Text) através da função `getPlainTextFromSession()`. Os dados chegam brutos na ponte do serviço.

**Estruturação:**
O contexto do paciente é unificado na interface `PatientDataContext`, montando um perfil coeso que isola fatos clínicos (idade, diagnóstico) de dados subjetivos (anotações livres da sessão).

---

## 3. Processo de Seleção e Montagem dos Dados
A lógica de negócio injetada no Mega-Prompt de IA define como os dados serão consumidos.

**Critérios de Seleção da IA:**
O módulo atua em modo *Copiloto*. Se o profissional já começou a digitar algo no rascunho, a IA dá prioridade a preencher lacunas baseadas nas intenções já escritas.

**Regras de Negócio e Heurísticas Aplicadas:**
1. **Diferenciação Semântica (Observação vs Autorrelato):** A IA é programada a reportar fatos visíveis como "Observou-se" e emoções narradas como "Segundo relato...".
2. **Exiguidade Pericial:** Se a *purpose* (finalidade) for `inss_forensic`, a IA aplica abstração funcional, traduzindo "traumas graves" em "eventos estressores", impedindo o vazamento de detalhes sensíveis da vida do paciente na folha do perito.
3. **Mapeamento de Funcionalidade:** O LLM traduz intensidade dos sintomas em prejuízos funcionais compatíveis com ambientes de trabalho.

**Algoritmos/Modelos:**
Utilização do **Google Gemini (LLM)** via integração `@google/genai`. A chamada é configurada como `responseMimeType: 'application/json'` para assegurar previsibilidade na fragmentação das seções (ex: `1. Identificação`, `2. Exame do Estado Mental`).

---

## 4. Sistemas e Serviços Envolvidos
**Bancos de Dados:**
- **Supabase (PostgreSQL):** Persiste o estado do documento na tabela/store de documentos do paciente sob o formato JSON em `contentDraft`, permitindo Auto-Save e reabertura sem perda de dados.

**APIs e Integrações:**
- **Gemini API:** A interface assíncrona executa tentativas em cascata com modelos `gemini-3.5-flash`, `gemini-3.0-flash`, `gemini-2.5-flash` até `gemini-pro`, caindo por grace-degradation em caso de gargalos.

**Módulos Internos:**
- **Gerador Visual PDF (`@react-pdf/renderer`):** O `StructuredReportDocument.tsx` coleta a saída do modelo de IA e renderiza num formato Print-first de PDF estático, contendo cabeçalhos, rodapés de assinatura, rubricas e logs de autenticidade (Verification Codes).

---

## 5. Arquitetura Técnica

**Diagrama Funcional do Fluxo:**
1. `Frontend UI (React)` → Dispara `useAIGenerator` com o `PatientContext`.
2. `Builder de Prompt` → Compila `session.notes`, `anamnesis` + heurísticas (CFP) e Mega-Prompt em `aiDocumentService.ts`.
3. `LLM (REST para Gemini)` → Recebe Contexto -> Analisa -> Retorna JSON Estruturado.
4. `Parser & Sanitizer` → `parseLLMJSON` garante que a saída seja um objeto válido para o editor.
5. `Editor TipTap` → Exibe o diff para aceitação do psicólogo.
6. `Export` → Motor `@react-pdf/renderer` transforma as tags em layout impresso nativo.

**Protocolos:** Comunicação REST assíncrona entre o backend serverless/client e a Google API. A comunicação com o Supabase é gerenciada via cliente oficial (Websockets / REST).

---

## 6. Segurança e Conformidade
**Privacidade e LGPD/HIPAA:**
- Apenas informações estritamente necessárias (as últimas 5 sessões) são concatenadas ao payload do LLM.
- Não existem conexões a bancos de dados externos abertos. A interface de geração PDF roda *client-side*, garantindo que os relatórios em formato binário não fiquem temporariamente armazenados em servidores voláteis, mas sejam submetidos diretamente para o *Bucket Segurado do Supabase*.

**Modo Diferenciado de Sigilo:** 
No modo Forense (`inss_forensic`), os princípios de segurança ganham um layer extra: a própria IA é instruída a "rasurar" informações se constatar que o terapeuta inseriu relatos traumáticos pessoais no draft, garantindo sigilo frente a tribunais.

---

## 7. Exemplo Prático (Geração de Laudo INSS)
*Caso:* Paciente de 45 anos, afastada por ansiedade com traços somáticos e esquecimento, precisando de prorrogação junto à perícia administrativa.

1. **Ação:** O psicólogo abre a guia "Documentos", seleciona "Laudo Psicológico" e marca "Afastamento / INSS".
2. **Coleta:** O `PatientDataContext` puxa o CID (F41.1), as notas de sessão e envia para `generateClinicalDocument()`.
3. **Processamento:** O Gemini RAG processa as regras de inaptidão. Se nas notas estiver escrito "ela acha que não consegue voltar pro hospital porque tem medo das colegas", a IA processa isso sob a lente do módulo 2 (Observacional vs Relato) e Módulo 3 (Funcionalidade).
4. **Transformação (JSON):** A IA retorna a chave `"4. ANÁLISE CLÍNICA"` como: *"A paciente apresenta vulnerabilidade aumentada a contextos de estresse ocupacional. Segundo relato, experimenta reatividade autonômica frente a cobranças laborais."*
5. **Finalização:** O psicólogo revisa as seções no editor interativo e clica em "Gerar PDF", gerando um layout formal (Helvetica, Logo da Clínica e Rodapé de Autenticação).

---

## 8. Conclusão
**Impacto na Rotina:** O Módulo de IA transforma a elaboração documental de um estressor burocrático de 40 minutos para uma validação ágil de 5 minutos, garantindo qualidade técnica excepcional sem esforço semântico da parte do psicólogo.

**Melhorias Futuras:**
- Implementação de OCR nativo para permitir upload e injeção automática de escalas psicométricas escaneadas (como inventários Beck).
- Treinamento local ou RAG avançado usando um repositório de laudos modelo da própria clínica do profissional (para clonar seu estilo literário).
