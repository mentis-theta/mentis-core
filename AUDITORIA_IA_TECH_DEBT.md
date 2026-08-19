# 🕵️‍♂️ Auditoria do Módulo de Análise de Conteúdo (IA) - Mentis

**Data da Auditoria:** 2026-03-05
**Módulos Focados:** Serviços de IA (Gemini, Groq), Utils de Áudio e Componentes de Interface.

Esta auditoria varreu o código do projeto "Mentis" para detalhar o uso da inteligência artificial dentro da plataforma, rastreando o fluxo de dados desde a interface até os provedores externos, destacando **onde estão sendo usados**, **como estão sendo usados** e o **débito técnico (tech debt)** encontrado em cada área.

---

## 1. 📍 Mapa de Uso Atual (Onde e Como)

A inteligência artificial do sistema está dividida basicamente em três grandes frentes clínicas: Análise de Áudio (Sessão), Geração de Documentos e Inteligência Clínica Geral.

### 1.1 `SessionRecorder.tsx` -> `audioService.ts`
- **Onde é usado:** Funcionalidade de gravação de voz ou upload de áudio da sessão dentro da aba de histórico do paciente.
- **Como é usado:** 
  1. O áudio do terapeuta é capturado pelo `MediaRecorder` ou via file upload.
  2. Passa pelo `optimizeAudio` (resample para 16kHz Mono) e em seguida é dividido em *chunks* para não estourar o limite de 25MB da Groq.
  3. A transcrição de áudio usa Whisper Large v3 (via `Groq SDK`).
  4. O texto bruto (junto com o contexto) é enviado ao Gemini 1.5 Pro/Flash via `callGeminiText` para formatar e gerar o *Resumo da Sessão*, *Mecanismos de Enfrentamento* e *Evolução Clínica*.

### 1.2 `GenerateDocumentModal.tsx` -> `aiDocumentService.ts`
- **Onde é usado:** Modal para gerar laudos, encaminhamentos e relatórios atrelados ao paciente.
- **Como é usado:**
  1. O usuário clica em "Gerar com IA".
  2. O serviço envia o perfil do paciente (idade, histórico, medicações) mais os resumos das últimas 5 sessões (em *plain text*) para o Gemini 2.5 Flash.
  3. A IA formata o conteúdo respeitando restrições, como, por exemplo, preenchendo as 6 seções obrigatórias da CFP 06/2019 para um Laudo. O parser de frontend divide as strings nas seções da UI.

### 1.3 Insights Clínicos, Genograma e Mapas -> `geminiService.ts`
- **Onde é usado:** Abas clínicas do paciente (Anamnese, Insights, Maps).
- **Como é usado:** Trata-se de um "canivete suíço" com o Google GenAI. Contém as lógicas que, a partir do histórico bruto das sessões, geram automaticamente as tags da sessão (`analyzeSessionNotes`), sugestões de intervenções RAG, Resumo Geral de Insights, estrutura biográfica da Anamnese Estruturada e a construção relacional JSON para o *Bioecological Map* e *Genograma*.

---

## 2. ⚠️ Dívidas Técnicas Identificadas (Tech Debt)

Abaixo listamos as dívidas cruciais encontradas na arquitetura. Nenhuma delas "quebra" imediatamente a plataforma, mas representam complexidade, redundância ou potenciais gargalos de performance e estabilidade.

### 🛑 2.1 Bug e Redundância de Chunking (Processamento de Áudio Duplicado)
**Arquivos envolvidos:** `SessionRecorder.tsx`, `audioOptimizer.ts`, `audioChunker.ts`, `audioService.ts`.
- **A Dívida:** No processo de envio, o arquivo `SessionRecorder.tsx` primeiro chama `optimizeAudio(...)` (que também divide do áudio em partes). Se a divisão retorna 1 parte, a interface chama `analyzeSessionAudio(optimizedChunks[0].blob)`. No entanto, dentro da função `analyzeSessionAudio`, o código invoca DE NOVO a função `splitAudioIntoChunks(...)` em cima desse áudio. Isso gera uma duplicação ineficiente de processamento do buffer de áudio na memória do browser do usuário.
- **Sugestão de Refatoração:** Unificar e consolidar a responsabilidade. O `audioOptimizer.ts` já faz as vezes do `audioChunker.ts` gerando WAVs, logo `audioChunker.ts` precisaria apenas lidar com fallback de arquivos gigantes, ou ser inteiramente substituído.

### 🛑 2.2 Duplicação do Parsers e Limpadores Anti-Bug da IA
**Arquivos envolvidos:** `geminiService.ts`, `audioService.ts`.
- **A Dívida:** A função de limpar Markdown do JSON retornado pela IA (remover as tags ` ` `json ` ` ` e escapar caracteres de controle) foi reimplementada várias vezes em lugares diferentes. Existe a função `cleanAndSanitizeJson` em `audioService.ts` e a função `cleanAIResponse` no `geminiService.ts`. Além disso, ambos usam `JSON.parse` encadeado de blocos repetitivos `try/catch`. 
- **Sugestão de Refatoração:** Centralizar um utilitário `parseGeminiResponse(rawText)` garantindo tipagem forte. 

### 🛑 2.3 Fragmentação da Geração de Documentos (UI Bipolar)
**Arquivos envolvidos:** `DocStation.tsx` x `GenerateDocumentModal.tsx`.
- **A Dívida:** Existe um gap considerável no ecossistema de geração de PDFs. Há o `DocStation.tsx` criado apenas com base em substituição de variáveis hardcoded (um "template engine" tradicional) e sem nenhum suporte aos serviços de IA; paralelo a ele existe o `GenerateDocumentModal.tsx`, que é o modal modal responsável pela IA de fato. 
- **Sugestão de Refatoração:** Integrar o botão ✨ *Gerar com IA* e o `aiDocumentService` diretamente para dentro da arquitetura final moderna do `DocStation.tsx`, removendo o modal obsoleto se o `DocStation` se tornar o provedor oficial de arquivos.

### 🛑 2.4 Bloqueio/Sleep Hardcoded de Rate Limiting da Groq
**Arquivos envolvidos:** `audioService.ts`
- **A Dívida:** Devido ao *free tier* limitado da API da Groq, existe constantes mágicas no código (como `const GROQ_DELAY_MS = 60000;`) que pausam deliberadamente a thread ou as promessas do usuário por 1 minuto inteiro antes de processar um segundo chunk. Funciona, claro, mas na perspectiva UX causa a impressão que "o navegador travou" caso os áudios tenham mais de 5-10 minutos de fala contínua sem que a GUI seja responsiva frente a isto.
- **Sugestão de Refatoração:** Mapear os tempos passados por *Server sent Events* ou repassar ao backend de forma assíncrona; em ambiente serverless/edge, é complicado. 

### 🛑 2.5 Hardcoded Prompts fora do padrão estruturado
**Arquivos envolvidos:** `aiDocumentService.ts` e `audioService.ts`.
- **A Dívida:** O serviço de prompts genéricos existe no arquivo unificado `prompts.ts`, porém a instrução da resolução restritiva sobre a normativa do Laudo (`CFP_GUIDELINES`) está *hardcoded* direto como uma string declarada em `aiDocumentService.ts`. O mesmo vale para os prompt longos em `audioService.ts` onde a constante `TEXT_ANALYSIS_PROMPT` reside.
- **Sugestão de Refatoração:** Mover todas as strings de injeção base do LLM para o agrupador `prompts.ts`.

### 🛑 2.6 Propriedades Legadas de Áudio (`transcript` e `evolution`)
**Arquivos envolvidos:** `audioService.ts`
- **A Dívida:** O tipo de exportação `AudioAnalysisResult` continua carregando a propriedade `transcript: TranscriptLine[]` vazia e um fallback mockado do `evolution` só para não quebrar componentes do passado que costumavam esperar que a resposta trouxesse diálogo com detecção de alto-falantes antes de vocês abolirem a transcrição limpa.
- **Sugestão de Refatoração:** Se o frontend já consome exclusivamente os três campos recentes (`resumo_sessao`, `mecanismos_enfrentamento`, `evolucao_clinica`), remover inteiramente os resíduos nostálgicos e as tipagens de locutores que adicionam kilobytes extras ao JSON final do Supabase.

### 🛑 2.7 Uso generalizado de "Any" em Catch Errors 
Múltiplas instâncias de `catch (error: any)` estão espalhadas entre os provedores Gemini e Groq. Isso é um tech debt leve, mas perde vantagens de segurança do TypeScript e esconde eventuais estruturas nulas de retorno do axios/fetch caso haja fallback HTTP.

---

## 3. Conclusão da Qualidade Técnica
Embora possua dívidas focadas nestes módulos de Chunking Duplo (*Double Process*) de Buffers e dispersões do formato da função de IA de Tratativas de PDF, o design assíncrono do módulo de **Inteligência de Áudio** e do gerador de **Insights** é excepcionalmente resiliente. O tratamento contra alucinação do reconhecimento do Whisper está limpo e os prompts seguem diretrizes pragmáticas (como a proibição severa de invenção de nomes reais de pacientes). Sanando os débitos de *duplicação*, o núcleo AI se provará pronto e facilmente escalável.
