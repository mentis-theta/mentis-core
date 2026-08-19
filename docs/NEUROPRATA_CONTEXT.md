# NeuroPrata — Contexto Técnico Completo

> **Gerado em:** 2026-03-04  
> **Propósito:** Fonte da verdade para alimentar assistentes de IA com o contexto exato da plataforma.  
> **Projeto:** Mentis (nome interno) / NeuroPrata (nome comercial)  
> **Versão:** 0.1.5 (MVP)

---

## 1. Visão Geral da Arquitetura e Stack

### 1.1 Tecnologias Principais

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | React | 19.1 |
| **Bundler** | Vite | 6.2 |
| **Linguagem** | TypeScript | 5.8 |
| **Estilização** | Tailwind CSS | 3.4 |
| **Backend / BaaS** | Supabase (Auth + DB + Storage + RLS) | SDK 2.86 |
| **Deploy** | Vercel (SPA com `vercel.json` rewrite) | — |
| **Monitoramento** | Sentry (`@sentry/react`) | 10.39 |
| **Testes E2E** | Cypress | 15.10 |

### 1.2 Bibliotecas-Chave

| Lib | Uso |
|---|---|
| `react-router-dom` v7 | Roteamento SPA (sem Next.js) |
| `@supabase/supabase-js` | Auth, DB, Storage, Realtime |
| `@tanstack/react-query` | Cache offline, persistência, devtools |
| `@react-pdf/renderer` | Geração de PDFs clínicos (DocStation) |
| `jspdf` + `jspdf-autotable` | PDFs legados (recibos, relatórios) |
| `@tiptap/react` + `starter-kit` | Rich Text Editor (notas de sessão) |
| `@xyflow/react` | Genograma e Mapa Sistêmico (Eco-Map) |
| `@dnd-kit` (core/sortable) | Drag & Drop (reordenar pacientes, módulos) |
| `recharts` | Gráficos financeiros e analíticos |
| `lucide-react` | Ícones |
| `date-fns` | Formatação de datas (locale `ptBR`) |
| `groq-sdk` | Transcrição de áudio (Whisper v3 via Groq) |
| `@google/genai` | Análise clínica de texto (Gemini API) |
| `crypto-js` | Criptografia AES (Vault de dados sensíveis) |
| `canvas-confetti` | Feedback visual de gamificação |
| `qrcode` | QR Code para "Meu Link" público |
| `ua-parser-js` | Detecção de dispositivo/browser |
| `html-to-image` | Exportação de componentes visuais |
| `react-markdown` | Renderização de conteúdo Markdown |

### 1.3 Padrão de Roteamento

O app **não usa Next.js**. É uma SPA pura com `react-router-dom` v7.

```
App.tsx (BrowserRouter no index.tsx)
├── /book/:schedule_uid     → <BookingRoute />  (Público, sem auth)
├── /?schedule_uid=xxx      → <PublicBookingPage />  (Bypass do Auth Guard via query string)
├── /portal/*               → <PortalRoutes />  (Portal do Paciente, auth separada)
└── /*                      → <ProtectedAppLogic />  (App principal, requer auth)
```

**Navegação interna** é gerida por `NavigationContext` com estados `mainView` (`dashboard`, `calendar`, `patients`, `financial`, `library`, `staff`, `admin`) e não por rotas de URL. Cada view é renderizada condicionalmente em `AppRoutes.tsx`.

**Lazy Loading:** Todas as views principais usam `lazyWithRetry()` (wrapper custom em `utils/lazyLoad.ts`) para code-splitting automático.

### 1.4 Hierarquia de Contextos (Providers)

```
ThemeProvider
└── CryptoProvider         (Vault AES: lock/unlock com masterKey)
    └── AuthProvider       (Supabase Auth + perfil + MFA + Sentry)
        └── ColorProvider  (Temas visuais do "Meu Link")
            └── ToastProvider
                └── ConfirmProvider
                    └── NavigationProvider  (mainView, selectedPatientId)
                        └── ModalProvider  (estado global de modais)
                            └── PatientContextWrapper  (CRUD de pacientes via Supabase)
```

### 1.5 Estrutura de Diretórios

```
Mentis/
├── App.tsx                  # Roteador raiz + bypass público
├── index.tsx                # ReactDOM.createRoot + BrowserRouter
├── types.ts                 # 735 linhas — todos os types centrais
├── constants.tsx             
├── components/
│   ├── Layout/              # MainLayout, Sidebar, Header, AppRoutes, UserMenu
│   ├── Patient/             # PatientList, PatientDetail, AnamnesisTab, GenogramTab, etc.
│   ├── Session/             # SessionRecorder, SessionEditorModal, AppointmentModal, etc.
│   ├── Documents/           # DocStation, DocumentEditor, TemplateSidebar, documentTemplates
│   ├── Dashboard/           # MeuEspacoDashboard, FinancialManager
│   ├── Finance/             # ClinicalDocument (PDF), Ledger, Charts
│   ├── Settings/            # Profile, ServiceHours, SecuritySettings, ColorContext
│   ├── Portal/              # PortalRoutes, PortalHome, PortalLogin, Tools (RPD, Breathing, etc.)
│   ├── PublicScheduling/    # PublicBookingPage (formulário público de agendamento)
│   ├── LeadsInbox/          # LeadsInbox, LeadsInboxPopover (inbox de solicitações)
│   ├── Clinical/            # Ferramentas clínicas (se houver)
│   ├── Library/             # Biblioteca de conteúdos (bibliotherapy, cinema, etc.)
│   ├── Psychoeducation/     # TrailBuilder, TrailLibrary (trilhas gamificadas)
│   ├── Themes/              # Temas visuais para "Meu Link" (Standard, Journal, etc.)
│   ├── Tools/               # EMDR, ACT Matrix, etc.
│   ├── Admin/               # AdminDashboard
│   └── ui/                  # Componentes genéricos de UI
├── contexts/                # 8 contextos React (Auth, Modal, Navigation, Patient, etc.)
├── hooks/                   # 32 hooks custom (usePatientOperations, useSessionEditor, etc.)
├── services/                # 15 services (auth, audio, booking, gemini, pdf, storage, etc.)
├── utils/                   # 14 utilitários (audioOptimizer, formatters, validators, etc.)
├── supabase/migrations/     # 36 arquivos SQL de migração
└── public/                  # Manifest PWA, ícones, favicon
```

---

## 2. Estado do Banco de Dados e Autenticação

### 2.1 Esquema Principal (Tabelas Supabase)

| Tabela | Descrição | Owner Column |
|---|---|---|
| `profiles` | Perfil do profissional (psicólogo/staff/admin). Fields: `name`, `role`, `crp`, `email`, `encrypted_master_key`, `key_salt`, `service_hours` (JSONB), `scheduling_settings` (JSONB), `social_links`, `custom_links`, `services`, `theme_id`, `color_scheme`, etc. | `id` (= `auth.uid()`) |
| `patients` | Dados do paciente. Fields: `name`, `cpf`, `phone`, `birth_date`, `data` (JSONB — contém `sessions`, `goals`, `documents`, `anamnesis`, `genogramData`, `systemicMap`, `insights`). | `user_id` |
| `scheduling_requests` | Solicitações de agendamento público. Fields: `psychologist_id`, `patient_name`, `patient_phone`, `patient_email`, `patient_cpf`, `patient_birth_date`, `modality`, `requested_time`, `notes`, `status` (`pending`/`approved`/`rejected`). | `psychologist_id` |
| `public_availability` | Slots de disponibilidade/indisponibilidade. Fields: `psychologist_id`, `start_time`, `end_time`, `is_available`, `session_id`. | `psychologist_id` |
| `clinical_records` | Registros clínicos estruturados (Tiptap JSON). Fields: `patient_id`, `author_id`, `session_id`, `date`, `type` (`session_summary`/`clinical_tool`/`private_note`/`emdr_log`), `content` (JSONB), `metadata` (JSONB). | `author_id` |
| `expenses` | Controle financeiro. Fields: `user_id`, `description`, `amount`, `date`, `category`, `is_paid`, `type` (`income`/`expense`), `session_id`, `payment_method`. | `user_id` |
| `audit_logs` | Trilha de auditoria de segurança. Fields: `actor_id`, `action`, `resource`, `resource_id`, `details` (JSONB), `ip_address`. | `actor_id` |
| `login_attempts` | Proteção contra brute force. Fields: `ip_address`, `email`, `attempted_at`. | — |
| `reminders` | Lembretes do profissional. Fields: `user_id`, `patient_id`, `description`, `color`, `due_date`, `is_completed`. | `user_id` |
| `library_items` | Itens da biblioteca (bibliotherapy, etc.). Fields: `userId`, `title`, `category`, `url`, `isPublic`. | `userId` |
| `thought_records` | Registros de pensamento do paciente (Portal). Fields: `patient_id`, `emotion`, `intensity`, `situation`, `automatic_thoughts`, `rational_response`. | `patient_id` |
| `patient_files` (Storage bucket) | Arquivos uploadados por paciente. | via Storage policies |
| Tabelas de Psicoeducação: `trails`, `trail_modules`, `trail_steps`, `trail_assignments`, `trail_progress` | Trilhas gamificadas com módulos, passos e progresso. | `author_id` / `patient_id` |

### 2.2 Modelo de Dados: Híbrido SQL + JSONB

O design é **semi-NoSQL**: a tabela `patients` armazena a maior parte dos dados clínicos como um campo JSONB gigante (`data`), que contém `sessions[]`, `goals[]`, `documents[]`, `anamnesis`, `genogramData`, `systemicMap`, e `insights[]`. Isso é gerido pelo hook `usePatientOperations.ts` (28KB, o maior hook do projeto).

Tabelas relacionais separadas existem para dados que precisam de queries independentes: `clinical_records`, `expenses`, `scheduling_requests`, `audit_logs`.

### 2.3 Autenticação

**Provider:** Supabase Auth (email + senha).

**Fluxo de Login:**
1. Rate-limit check via tabela `login_attempts` (máx. 5 tentativas em 15min por IP).
2. `supabase.auth.signInWithPassword()`.
3. Busca `encrypted_master_key` e `key_salt` do `profiles`.
4. Deriva KEK (Key Encryption Key) a partir da senha via `cryptoService.deriveKeyFromPassword()`.
5. Unwrap da Master Key com `cryptoService.unwrapKey()`.
6. Verifica se MFA (TOTP) é necessário (`getAuthenticatorAssuranceLevel()`).
7. Se tudo OK, seta `currentUser` e `unlockVault(masterKey)`.

**Registro:**
1. Gera `masterKey` + `salt`.
2. Deriva KEK e wrapa a Master Key.
3. `supabase.auth.signUp()` com metadata.
4. Atualiza `profiles` com `encrypted_master_key` e `key_salt`.

**MFA:** Suporte completo a TOTP via `supabase.auth.mfa` (enroll, challenge, verify, unenroll). UI em `SecuritySettings`.

**Bypass de E-mail:**
> ⚠️ **Estado atual:** A confirmação de e-mail está desabilitada no Supabase Dashboard. Motivo: o domínio customizado no Resend ainda não foi configurado, então os e-mails de confirmação não são enviados. Novos usuários são cadastrados via **injeção manual de SQL** no Supabase SQL Editor. Este é um workaround temporário aceitável para o MVP.

**Injeção de Usuários (Workaround atual):**
```sql
-- Exemplo: Inserir perfil após criar user no Auth
INSERT INTO public.profiles (id, name, email, role, crp)
VALUES ('uuid-do-auth-user', 'Dr. Fulano', 'email@exemplo.com', 'psychologist', '06/123456');
```

### 2.4 Políticas de Segurança (RLS)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `auth.role() = 'authenticated'` | via Trigger/manual | `auth.uid() = id` | — |
| `patients` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `expenses` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `audit_logs` | `auth.uid() = actor_id` | `auth.uid() = actor_id` | — | — |
| `scheduling_requests` | `auth.uid() = psychologist_id` | `true` (público pode inserir) | `auth.uid() = psychologist_id` | — |
| `public_availability` | `true` (público pode ver) | `auth.uid() = psychologist_id` | `auth.uid() = psychologist_id` | `auth.uid() = psychologist_id` |
| `clinical_records` | `auth.uid() = author_id` | `auth.uid() = author_id` | `auth.uid() = author_id` | — |

**Regra de Acesso Público (Hotfix crítico):**
A RLS estrita em `profiles` impedia o acesso anônimo ao perfil do psicólogo na página pública de agendamento. Solução: **RPC `SECURITY DEFINER`** chamada `get_public_profile(profile_id uuid)` que retorna **apenas campos não-sensíveis** (nome, especialidade, foto, horários, etc.) — definida em `supabase_migration_fix_public_access.sql`.

---

## 3. Fluxos Principais

### 3.1 Agendamento Público

**Ponto de Entrada:** O psicólogo compartilha um link público (ex: `https://mentis.app/?schedule_uid=UUID` ou `https://mentis.app/book/UUID`).

**Fluxo Completo:**

```
1. Paciente acessa URL com schedule_uid
2. App.tsx detecta:
   - Rota /book/:schedule_uid → <BookingRoute /> (direto, sem auth)
   - Query param ?schedule_uid=xxx → <PublicBookingPage /> (bypass no ProtectedAppLogic)
3. PublicBookingPage carrega:
   - bookingService.getPsychologistProfile(uid) → RPC get_public_profile (SECURITY DEFINER)
   - bookingService.getPublicAvailability(uid, startRange, endRange)
4. Paciente vê: foto, nome, especialidade, horários disponíveis
5. Paciente seleciona slot → preenche formulário:
   - Nome, Telefone, E-mail (opcional), CPF (opcional), Data de Nascimento (opcional)
   - Modalidade (online/presencial)
   - Observações
   - ☑ Checkbox LGPD: "Li e concordo com a Política de Privacidade"
6. bookingService.createSchedulingRequest() → INSERT na tabela scheduling_requests (status: 'pending')
7. Tela de sucesso com confetti 🎉
```

**Consentimento LGPD:** Coletado **apenas no frontend** via checkbox obrigatório antes do submit. Não há campo de consentimento na tabela `scheduling_requests` — é um aceite implícito no ato de submeter o formulário.

**Lado do Psicólogo (Inbox):**
- `LeadsInbox.tsx` e `SchedulingRequestsList.tsx` exibem solicitações `pending` na view de Agenda.
- `SchedulingRequestDetail.tsx` mostra detalhes completos.
- Botões: **Aprovar** (muda status para `approved`) e **Recusar** (muda para `rejected`).
- ⚠️ **Limitação atual:** Aprovar uma solicitação muda apenas o `status`. **NÃO converte automaticamente em Patient** nem cria sessão no calendário. Isso é manual.

### 3.2 Sessões e Telemetria de Áudio

**SessionRecorder.tsx** oferece duas modalidades:
1. **Gravação ao vivo:** Usa `MediaRecorder` API para capturar áudio do microfone.
2. **Upload de arquivo:** Aceita MP3, WAV, M4A, WebM, OGG (máx. 500MB).

**Pipeline de Processamento (Groq + Gemini):**

```
1. Áudio bruto (File/Blob)
     ↓
2. audioOptimizer.ts: Converte para 16kHz mono WAV (AudioContext + OfflineAudioContext)
     ↓
3. audioChunker.ts: Divide em chunks de 5 minutos (~10MB cada, safe para o limite de 25MB do Groq)
     ↓
4. FASE 1 — TRANSCRIÇÃO (Groq):
   - Para cada chunk: transcribeWithGroq() → Whisper Large v3, idioma PT, temp 0.0
   - Rate limiting: 60s de pausa entre chunks (Free Tier)
   - Retry com backoff exponencial (máx. 5 tentativas)
   - Resultado: texto bruto concatenado com marcações de tempo
     ↓
5. FASE 2 — ANÁLISE CLÍNICA (Gemini):
   - callGeminiText() com prompt TEXT_ANALYSIS_PROMPT
   - Fallback automático entre modelos: gemini-1.5-pro → flash → 1.0-pro
   - Prompt: "Atue como psicólogo supervisor sênior"
   - REGRA: "NUNCA INVENTE NOME DE PACIENTES"
   - Output JSON: { resumo_sessao, mecanismos_enfrentamento, evolucao_clinica }
     ↓
6. Post-processing:
   - removeTrailingLoop(): Detecta e remove loops de alucinação do modelo
   - killZombieLoops(): Remove sequências de "Sim/Aham" repetitivas
   - cleanAndSanitizeJson(): Escape de control characters
     ↓
7. Resultado salvo nos campos da Session: resumo_sessao, mecanismos_enfrentamento, transcript
```

**Telemetria:** O `auditLogger.ts` registra ações como `LOGIN`, `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `EXPORT` na tabela `audit_logs` com IP, User-Agent e detalhes.

### 3.3 Documentação Clínica (DocStation)

**Componente:** `components/Documents/DocStation.tsx`

**Templates Disponíveis** (definidos em `documentTemplates.ts`):
- Atestado de Comparecimento
- Declaração de Acompanhamento
- Encaminhamento (livre, psiquiatria, escolar)
- Relatório Psicológico (estruturado com seções)
- Laudo Psicológico (estruturado com seções)

**Fluxo:**
1. Psicólogo seleciona template na `TemplateSidebar`.
2. Seleciona paciente via dropdown.
3. `documentTemplates.generateVariables()` preenche placeholders: `PACIENTE_NOME`, `PSI_CRP`, `DATA_HOJE`, etc.
4. Psicólogo edita o texto no `DocumentEditor` (textarea com preview).
5. Clica "Gerar PDF" → `@react-pdf/renderer` gera o blob.
6. Download automático do PDF com código de verificação UUID.

**Gerador de PDF legado:** `services/pdfService.ts` usa `jspdf` + `jspdf-autotable` para recibos e relatórios financeiros.

**Componente PDF:** `components/Finance/ClinicalDocument.tsx` é o template `@react-pdf/renderer` usado pelo DocStation.

---

## 4. Dívidas Técnicas Mapeadas (Aceitáveis para o MVP)

### 4.1 Usos de `as any` Remanescentes

Foram identificados **~50 usos de `as any`** no código. Todos são **aceitáveis para o MVP** pois se enquadram em categorias previsíveis:

| Categoria | Exemplos | Quantidade | Justificativa |
|---|---|---|---|
| **Supabase Client** | `authService.ts` L128, L132, L322, L341 — `.select(SAFE_PROFILE_COLUMNS as any)` | ~6 | O SDK do Supabase não possui tipagem generics completa para `.select()` dinâmico. |
| **Supabase RPC/Response** | `bookingService.ts` L42 — `data as any` | ~4 | Retorno de RPCs (`rpc()`) não tem tipo inferido. |
| **Supabase JSON Casting** | `useACTMatrix.ts` L54, L72 — `content: matrixContent as any` | ~8 | Campos JSONB retornados como `unknown` pelo Supabase. |
| **Browser APIs** | `audioOptimizer.ts` L12 — `(window as any).webkitAudioContext` | ~4 | APIs com prefixo de vendor não tipadas. |
| **jsPDF** | `pdfService.ts` L62, L103 — `(doc as any).lastAutoTable` | ~2 | Plugin `jspdf-autotable` não tem tipos completos. |
| **React Form Events** | `AppointmentModal.tsx` — `e.target.value as any` | ~8 | Valores de `<select>` que precisam de cast para union types. |
| **@xyflow/react** | `GenogramTab.tsx` L248-249, `SystemicMapTab.tsx` L188 — `nodes as any` | ~3 | Incompatibilidade de tipos entre versões do xyflow. |
| **Tiptap** | `RichTextRenderer.tsx` L17 — `content: content as any` | ~1 | Tiptap aceita JSON e string mas o tipo estrito reclama. |
| **Outros** | `PatientList.tsx`, `BrandingSettings.tsx`, `TrailBuilder.tsx`, etc. | ~14 | Casts pontuais para propriedades dinâmicas ou tipagens de terceiros. |

### 4.2 TODO Pendente no DocStation

**Arquivo:** `components/Documents/DocStation.tsx`, **Linha 57**

```typescript
// TODO: Create specialized components for Laudo and Relatorio
```

**Contexto:** Atualmente, todos os templates de documento usam o componente genérico `ClinicalDocument` do `@react-pdf/renderer`. Templates estruturados como **Laudo** e **Relatório** (que possuem múltiplas seções definidas em `documentTemplates.ts`) são renderizados como texto corrido via formato de "Encaminhamento". Futuramente, devem ter componentes PDF dedicados com layout de seções adequado.

### 4.3 Campos JSONB Gigantes

A tabela `patients` usa um campo `data` JSONB que contém toda a informação clínica embeddada (sessões, metas, documentos, anamnese, genograma, mapa sistêmico, insights). Isso funciona para o MVP mas pode gerar problemas de performance com pacientes com muitas sessões (100+). Migrar sessões e documentos para tabelas relacionais separadas é uma melhoria futura.

### 4.4 Console Logs Residuais

Existem `console.error` e `console.warn` legítimos em catches de erro (são úteis para debugging em produção via Sentry), mas não há `console.log` de debug remanescente — foram limpos na última varredura de tech debt.

---

## 5. Backlog e Próximos Passos (O que falta para fechar o MVP)

### 5.1 Crítico (Bloqueia o ciclo do MVP)

- [ ] **Interface "Inbox" interna para aprovar/recusar solicitações e converter em paciente:**
  - O componente `LeadsInbox.tsx` já existe e exibe solicitações pendentes com botões Aprovar/Recusar.
  - O `SchedulingRequestDetail.tsx` já exibe detalhes completos.
  - **O que falta:** ao clicar "Aprovar", o fluxo deve:
    1. Mudar status para `approved`.
    2. **Criar automaticamente um registro `Patient`** com os dados da solicitação (nome, telefone, email, CPF, data de nascimento).
    3. Opcionalmente, criar uma `Session` no calendário no horário solicitado.
  - Hoje, aprovar apenas muda o `status` — não cria paciente nem sessão.

- [ ] **Configuração de domínio no Resend + ativar confirmação de e-mail no Supabase:**
  - Atualmente o cadastro de novos psicólogos é feito via SQL manual.
  - Com o domínio configurado, o fluxo de `register()` em `authService.ts` funcionará end-to-end.

### 5.2 Importante (Melhora significativa do produto)

- [ ] **Componentes PDF especializados** para Laudo e Relatório no DocStation (ref: TODO L57).
- [ ] **Sync bidirecional Agenda ↔ Agendamento Público:** Quando o psicólogo cria uma sessão manualmente no calendário, marcar automaticamente o slot como `is_available = false` na `public_availability`. O `bookingService.syncSessionToAvailability()` já existe mas não é chamado consistentemente.
- [ ] **Notificações de novas solicitações:** Push notification ou badge no sidebar quando chega nova `scheduling_request` (hoje requer refresh manual ou navegação para a aba).
- [ ] **Portal do Paciente — Acesso direto a tarefas e trilhas:** O portal já existe (`/portal/*`) com login separado via `usePatientAuth`, mas a experiência pode ser enriquecida com notificações e gamificação mais ativa.

### 5.3 Nice-to-Have (Pós-MVP)

- [ ] Migrar `sessions[]` e `documents[]` de JSONB embeddado para tabelas relacionais.
- [ ] Eliminar usos de `as any` (tipagem forte com generics do Supabase).
- [ ] Implementar testes unitários e de integração (hoje só existe setup do Cypress E2E).
- [ ] Adicionar i18n (internacionalização) — hoje tudo hardcoded em pt-BR.
- [ ] Sistema de pagamento integrado (Stripe/Mercado Pago) para pré-pagamento de sessões.
- [ ] Histórico de versão para notas de sessão (Tiptap collaboration extensions).

---

## Apêndice A: Mapa de Hooks

| Hook | Responsabilidade |
|---|---|
| `usePatientOperations` | CRUD completo de pacientes, sessões, metas, documentos (28KB, maior hook) |
| `useSessionEditor` | Lógica de edição/criação de sessões |
| `useFinancialData` | Queries financeiras (receitas, despesas, métricas) |
| `useDashboardMetrics` | Métricas do dashboard "Meu Espaço" |
| `useClinicalRecords` | CRUD de registros clínicos (Supabase `clinical_records`) |
| `useSchedulingRequests` | Fetch e mutations de solicitações de agendamento |
| `usePatientList` | Filtro e busca de pacientes |
| `usePatientAuth` | Autenticação do portal do paciente |
| `usePortalUser` | Dados do paciente logado no portal |
| `usePortalTools` | Ferramentas do portal (RPD, Coping Cards, Diário) |
| `useACTMatrix` | CRUD da Matriz ACT |
| `useEMDR` | CRUD de registros EMDR |
| `useRPD` | Registro de Pensamento Disfuncional |
| `useInventories` | Escalas clínicas (BDI, BAI, GAD-7, PHQ-9) |
| `useLibrary` | Biblioteca de conteúdos |
| `useTrails` | Trilhas de psicoeducação |
| `useTrailProgress` | Progresso do paciente nas trilhas |
| `useFileStorage` | Upload/download de arquivos (Supabase Storage) |
| `useDataExport` | Exportação de dados (JSON/CSV) |
| `useGamification` | XP, level, streak do portal |
| `useReminders` | CRUD de lembretes |
| `useGoalEditor` | Edição de metas terapêuticas |
| `usePatientAnalytics` | Métricas analíticas do paciente |
| `usePatientRPD` | RPD do lado do paciente (portal) |
| `useFolderOperations` | Agrupamento de pacientes em pastas |
| `useAppModals` | Helpers para abrir modais específicos |
| `useAppNavigation` | Helpers de navegação |
| `useTheme` | Dark/Light mode + tema M3 |
| `usePWA` | Detecção de PWA e prompt de instalação |
| `useFinancialMetrics` | Métricas financeiras derivadas |
| `usePortalLibrary` | Biblioteca do portal do paciente |
| `usePortalNavigation` | Navegação do portal |

## Apêndice B: Mapa de Services

| Service | Responsabilidade |
|---|---|
| `authService.ts` | Login, registro, MFA, profile CRUD, rate limiting (482 linhas) |
| `audioService.ts` | Pipeline Groq (Whisper) + Gemini (análise clínica) — 741 linhas |
| `bookingService.ts` | Agendamento público: availability, scheduling requests, profile público |
| `geminiService.ts` | Integração genérica com Gemini API (insights, sugestões) |
| `aiDocumentService.ts` | Geração de documentos com IA |
| `pdfService.ts` | Geração de PDFs legados (jsPDF) |
| `cryptoService.ts` | AES encrypt/decrypt, master key management |
| `auditLogger.ts` | Escrita de logs em `audit_logs`, detecção de IP |
| `storageService.ts` | Upload/download/delete no Supabase Storage |
| `knowledgeBaseService.ts` | Base de conhecimento para IA contextual |
| `migrationService.ts` | Migração localStorage → Supabase |
| `queryClient.ts` | Configuração do TanStack Query com persistência |
| `supabaseClient.ts` | Init do cliente Supabase |
| `prompts.ts` | Prompts de IA centralizados |

## Apêndice C: Tabela de Migrations SQL

| Arquivo | Descrição |
|---|---|
| `supabase_migration_security_hardening.sql` | Tabela `audit_logs`, RLS estrita em `patients`, `expenses`, `profiles` |
| `supabase_migration_scheduling.sql` | Tabelas `public_availability` e `scheduling_requests` + RLS |
| `supabase_migration_fix_public_access.sql` | RPC `get_public_profile` (SECURITY DEFINER) para acesso anônimo |
| `supabase_migration_expenses.sql` | Tabela `expenses` |
| `supabase_migration_compliance.sql` | Campos `deleted_at`, `archive_reason` em `patients` |
| `supabase_migration_mylink.sql` | Campos "Meu Link" em `profiles` |
| `supabase_migration_reminders.sql` | Tabela `reminders` |
| `20260209_create_clinical_records.sql` | Tabela `clinical_records` |
| `20260209_create_library_items.sql` | Tabela `library_items` |
| `20260209_create_storage_bucket.sql` | Bucket `patient-files` no Storage |
| `20260210_create_thought_records.sql` | Tabela `thought_records` |
| `phase19_psychoeducation.sql` | Motor de psicoeducação: `trails`, `trail_modules`, `trail_steps`, `trail_assignments`, `trail_progress` |
| `create_login_attempts_table.sql` | Tabela `login_attempts` (brute force protection) |
| Outros (~23 arquivos) | Alterações incrementais: adição de colunas, índices, temas, analytics, etc. |
