# Relatório de Auditoria MENTIS

Abaixo está o relatório detalhado e rigoroso focado nas camadas arquiteturais exploradas na aplicação React/Vite.

### 🔴 Crítico (Falhas arquiteturais graves e Segurança)

1. **Falta de Error Boundaries Globais**
   - **Problema:** Qualquer erro não tratado na árvore de renderização do React fará com que toda a aplicação desmonte (*White Screen of Death*), impedindo completamente a navegação ou oferecimento de uma página de "Falha Amigável" ao cliente ou profissional.
   - **Onde:** `App.tsx` (não possui `<ErrorBoundary>` ou equivalente envolvendo o `<AppRoutes>` e `<PortalRoutes>`).

2. **Desincronia de Tipagem / Uso abusivo de `any` em Services Core**
   - **Problema:** O uso excessivo de `any` para "calar" o compilador burla a segurança do TypeScript. Como o Supabase retorna respostas fortemente tipadas, mapear objetos com `any` mascara potenciais dessincronizações de payload da API.
   - **Onde:** 
     - `services/authService.ts` (Linha 29: a função `mapSupabaseUserToUser` espera parâmetros `sbUser: any, profile: any`).
     - `services/storageService.ts` (Linhas 16-22 no loop e parsing de pacientes dentro de `migrateAndValidatePatientsData`).
     - `hooks/useTrails.ts` (Possui dezenas de ocorrências utilizando `(trail: any)`, `(step: any)`, `err: any`).

---

### 🟡 Aviso (Code Smells e Práticas Ruins)

1. **Blocos Try/Catch Silenciados**
   - **Problema:** Algumas chamadas de API estão capturando requisições falhas de forma anônima, silenciando o console e retornando apenas `false` ou tipando o catched error como `any` sem enviar logs apropriados para telemetria estruturada.
   - **Onde:** 
     - `hooks/useLibrary.ts` (Linha 163: `catch(() => false)` mascara permanentemente o motivo da api falhar no item `createLibraryItem`).
     - `hooks/useTrails.ts` (Linhas 116, 146).

2. **`console.log` de Debug Vazando em Ambiente Produtivo**
   - **Problema:** Logs de controle de fluxo contendo termos técnicos esquecidos na build final de produção que inflam o console do navegador do usuário e podem ser interceptados em logs de tela.
   - **Onde:** 
     - `utils/migrateInvoices.ts` (Linhas 30, 38, 50, 78: quase 15 *console.logs* descrevendo autenticação e migrações detalhadas de faturas).
     - `components/LazyFinancialMigrator.tsx` (Linhas 75 e 84).
     - `components/Settings/sections/SecuritySettings.tsx` (Linha 182).

3. **God Classes (Responsabilidades excessivas em Hooks)**
   - **Problema:** Hooks ou Utils que cresceram organicamente englobando múltiplas tabelas, lógicas síncronas/assíncronas misturadas, inflacionando a manutenção de testes e coesão de regra de negócio.
   - **Onde:** `hooks/usePatientOperations.ts` (Um único arquivo manipulando de uma vez perfis de Auth, Invoices e Expenses nas mesmas mutaçẽs sobrepostas em quase 700 linhas).

---

### 🔵 Otimização (Melhorias de Performance)

1. **Ausência de Code-Splitting (`React.lazy`) nas Rotas Críticas**
   - **Problema:** O arquivo principal importar todas as rotas (públicas, assinantes vinculados, profissionais) de forma estática sobrecarrega o Bundle de JS inicial (*Time-to-Interactive*). Em uma arquitetura SaaS, um paciente visualizando um portal público não precisa carregar os painéis privados.
   - **Onde:** `App.tsx` (Linhas 18 a 24). Roteamento estático como `import PortalRoutes from ...` e `import AppRoutes from ...` deveriam estar sob `React.lazy()` encapsulados em um `<Suspense>`.

2. **Falta de Memoização em Filtros Complexos**
   - **Problema:** Operações de Array caras como ordenação customizada (dentro de sub-loops) ocorrendo na renderização da stack React de forma desenfreada (sem `useMemo`), podendo causar travamentos da *main thread* (Event Loop).
   - **Onde:** `hooks/useTrails.ts` (Linhas 58, 89 e 411 utilizam encadeamento de `.sort()` massivos e `.map()` repetitivos processando todos os Trails, Módulos e Etapas desnecessariamente sem estabilização de estado).

3. **Arquitetura de Métricas Expansiva (Risco de N+1 Queries lógicas)**
   - **Problema:** Há chamadas iterativas enchendo vetores front-end para exibição no Dashboard. Isso acarreta alto consumo dos conectores do Supabase. A lógica agregadora idealmente deveria ser em uma RP/View back-end para não sobrecarregar dispositivos com baixo processamento.
   - **Onde:** `hooks/useDashboardMetrics.ts` (Linhas 75, 126 instanciam requests de atividades preenchendo vetores vazios localmente ao invés de centralizar um payload otimizado pelo Supabase).
