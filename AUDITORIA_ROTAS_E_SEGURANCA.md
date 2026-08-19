# Auditoria de Segurança e Roteamento (Mentis / Clinical OS)

Esta auditoria analisa a arquitetura de roteamento atual do sistema, detalhando a separação entre rotas públicas ("vitrine") e privadas (Clinical OS).

> **Aviso Arquitetural**
> O ecossistema Mentis atual roda em **React + Vite** (Single Page Application). Diferente do Next.js (onde a guarda poderia ser feita centralmente no servidor com um `middleware.ts`), a proteção das nossas rotas corre puramente no escopo lógico do cliente (arquivos raiz deroteamento e controle de estado de autenticação). A "barreira" visual já existe, mas no modelo SPA a segurança infalível dos dados ocorre exclusivamente no Backend (RLS no Supabase).

---

## 1. Rotas Públicas (Vitrine, Acesso Externo e Login)

Estas rotas garantem livre acesso de rendering público. Para o agendamento, existem verificações proativas que impedem a renderização do ambiente de trabalho (Painel/Dashboard) em favor da vitrine.

*   **Página de Agendamento (Path param):** Acesso à rota isolada `/book/:schedule_uid`.
*   **Página de Agendamento (Query param - Bypass Central do App.tsx):** Toda visita com o parâmetro `?schedule_uid=...` injeta imediatamente o `PublicBookingPage`, isolando visualmente o visitante do sistema Clinical OS.
*   **Login Área do Paciente:** Rota de acesso `/portal/login` para credenciamento do Portal do Paciente.

> **Avaliação de Segurança (Frontend):** *Seguro.* O *Early return* ativado no arquivo `App.tsx` (caso exista `scheduleUid`) proíbe rigorosamente o restante da aplicação de ser instanciada no DOM. O paciente/visitante tem bloqueio forte visual aos componentes internos do sistema.

## 2. Rotas Privadas (Clinical OS e Portal)

Protegidas pela verificação de contexto gerada no provider `AuthContext` (`currentUser`).

### A Área do Portal do Paciente (`/portal/*`)
*O fluxo ocorre no módulo* `PortalRoutes.tsx`
*   Caso o campo `currentUser` retorne nulo em qualquer instante, o hook intercepta e encaminha a rota novamente pro `/portal/login`.
*   O paciente só tem liberdade de tráfego autenticado para os endereços `/portal`, `/portal/biblioteca`, `/portal/diario`, e ferramentas internas ativadas pela respectiva flag de recurso.

### A Área Profissional / Workspace (Clinical OS Principal)
*O fluxo ocorre no* `ProtectedAppLogic` *(raiz)* *e* `AppRoutes.tsx` *(rotas internas)*
*   O aplicativo proíbe o processamento estrutural (navegação, dados e renderes de módulo) operando em suspensão se o auth service estiver processando (`isLoadingAuth`) ou encaminhando ativamente para `AuthPage` caso o usuário não tenha token local.
*   As abas modulares (`calendar`, `patients`, `financial`, `admin`) seguem controles robustos baseados por RBAC (funções como `admin` ou `psychologist`), barrando visualmente elementos como *dashboard master* ou *detalhamentos organizacionais* de estarem operantes para os não-qualificados.

## 3. Veredito Estratégico & Passos Posteriores

1.  **Migração para Middleware "Real"?** Como a arquitetura está rodando no Vite (SPA), o "middleware.ts" idealizado precisaria rodar em uma infraestrutura SSR ou Edge para barrar os pacotes de javascript prematuramente. Porém, a proteção de layout feita via contexto que usamos agora cumpre com todos os fins necessários de Product Design.
2.  **Proteção dos Endpoints:** A separação visual atinge os critérios de segurança. Entretanto, a auditoria enfatiza: **O RLS (Row Level Security) do Supabase é a verdadeira muralha de segurança da saúde.** Se as regras do banco falharem, um usuário sem acesso ao view poderia forjar chamadas API no pacote Javascript interceptado.

O sistema Mentis está com os gates de renderização da interface configurados de forma íntegra, moderna e eficiente.
