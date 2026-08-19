# Mentis v0.1: Prontuário Eletrônico Seguro e Inteligente

Mentis é um Sistema de Prontuário Eletrônico (EHR) moderno para psicólogos e clínicas, focado em **privacidade absoluta** (Criptografia Ponta-a-Ponta), **inteligência clínica** (IA Generativa) e **experiência do usuário** premium.

![Status do Projeto](https://img.shields.io/badge/Versão-0.1_Beta-blue?style=flat-square)
![Segurança](https://img.shields.io/badge/Security-Fortress_Mode_(9.2%2F10)-green?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_+_Supabase_+_Gemini-purple?style=flat-square)

## 🛡️ Segurança e Privacidade (Ironclad Security)

Este projeto implementa uma estratégia de defesa em profundidade ("Defense in Depth") em nível bancário:

*   **Criptografia Ponta-a-Ponta (E2EE):** Dados sensíveis (anamneses, evoluções) são criptografados no navegador do cliente (Client-Side) usando AES-256 antes de serem enviados ao banco de dados.
*   **Autenticação Robusta:**
    *   **MFA (2FA):** Autenticação de Dois Fatores via TOTP (Authenticator App).
    *   **Rate Limiting:** Proteção contra força bruta (5 tentativas/15 min) com bloqueio de IP.
    *   **Gestão de Sessão:** Visibilidade de dispositivos conectados e "Botão de Pânico" para desconectar outros aparelhos.
*   **Chave Mestra do Usuário:** Cada psicólogo possui uma "Chave Mestra" (Master Key) derivada de sua senha, que nunca deixa o dispositivo de forma descriptografada.
*   **Row Level Security (RLS) "Ironclad":** Políticas rigorosas no Banco de Dados garantem isolamento total dos dados.
*   **Auditoria Forense:** Logs imutáveis com rastreamento de IP real para todas as ações críticas.
*   **Proteção Frontend:** Content Security Policy (CSP) rigorosa para mitigar XSS.
*   **Backups Automatizados:** Rotina de backup diário com retenção de 7 dias.

## ✨ Funcionalidades Principais

### 🧠 Gestão Clínica
*   **Prontuário Rico:** Histórico completo, Genograma interativo e Anamnese estruturada.
*   **Notas de Sessão Inteligentes:** Editor rico para evoluções.
*   **Insights de IA (Google Gemini):** O sistema analisa (com consentimento) as notas para sugerir hipóteses diagnósticas, padrões de comportamento e tags clínicas.

### 📅 Gestão de Consultório
*   **Agendamento Público:** Link personalizado para pacientes agendarem horários (com fluxo otimizado: Solicitação -> Cadastro -> Confirmação).
*   **Gestão Financeira:** Controle de receitas, despesas e status de pagamento das sessões.
*   **Painel Administrativo:** Visão geral de atendimentos e produtividade.

### 👥 Perfis e Acesso
*   **Múltiplos Papéis:** Suporte para Psicólogos, Funcionários e Administradores.
*   **Meu Espaço:** Dashboard personalizado para o profissional acompanhar suas metas financeiras e agenda.

## 🚀 Stack Tecnológica

O projeto utiliza as tecnologias mais recentes do ecossistema React:

*   **Frontend:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (com Design System customizado)
*   **Backend & Auth:** [Supabase](https://supabase.com/)
*   **IA Generativa:** [Google Gemini API](https://ai.google.dev/) (SDK Web)
*   **Criptografia:** `crypto-js` (implementação AES customizada)
*   **Visualização de Dados:** `recharts` e `reactflow`

## 🛠️ Instalação e Execução

### Pré-requisitos
*   Node.js 18+
*   Conta no Supabase (para Backend)
*   Chave de API do Google Gemini (para IA)

### Passos

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/jose-prata-neto/Mentis.git
    cd Mentis
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz baseado no exemplo abaixo:
    ```env
    VITE_SUPABASE_URL=sua_url_supabase
    VITE_SUPABASE_ANON_KEY=sua_key_anonima
    VITE_GEMINI_API_KEY=sua_key_gemini
    ```

4.  **Inicie o Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    ```

## 🏗️ Estrutura do Código

*   `src/components`: Componentes React divididos por domínio (Patient, Session, Admin).
*   `src/services`: Camada de serviço para APIs externas (Supabase, Gemini, Crypto).
    *   `auditLogger.ts`: Serviço centralizado de auditoria.
    *   `bookingService.ts`: Lógica de agendamento público (incluindo RPC seguro).
    *   `cryptoService.ts`: Funções de criptografia/descriptografia.
*   `src/contexts`: Gerenciamento de estado global (Auth, PatientContext, ModalContext).
*   `src/hooks`: Custom hooks (usePatientOperations, useAuth).

## 🤝 Contribuição

Este é um projeto proprietário em desenvolvimento ativo.

---

**Desenvolvido com foco em excelência técnica e ética profissional.**
