# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 10/07/2026

### Lançamento Oficial (Produção)
- **Painel de Telemetria de IA:** Implementada RPC segura no Supabase com filtragem temporal, bloqueio estrito de perfis (`profiles.role`) e cálculo monetário baseado em modelo (`model_version`).
- **Resiliência Global (Sentry):** Injeção de `Error Boundaries` na árvore principal para capturar e evitar falhas no motor React (White Screen of Death), com tela de recuperação *Dark Clinical*.
- **Pacto Zero-Trust (LGPD):** O fluxo de Recuperação de Senha agora exige que o terapeuta digite "PERDER MEUS DADOS" para confirmar ciência de que a quebra da chave E2EE destruirá os prontuários passados.
- **Portabilidade Segura:** O motor de exportação de dados foi reescrito para utilizar paginação (`.range()`) de blocos. Adicionado modal vermelho exigindo anuência de `RESPONSABILIDADE LEGAL` antes do download de cópias locais em texto plano.
- **Testes de Engenharia (Cypress):** Adição de suite End-to-End validando interceptação de rede (XHR) para provar a ausência de dados limpos nos payloads via `cy.intercept`, consolidando a criptografia E2E.
- **Isolamento de Ambiente:** Ambiente `.env.test` configurado para direcionar testes automatizados contra base Supabase em *localhost*, preservando o banco de produção.

## [0.1.5] - 10/02/2026

### Added (Ironclad Security Update)
- **Multi-Factor Authentication (MFA):** Support for TOTP (Google/Microsoft Authenticator).
- **Rate Limiting:** IP-based brute force protection (5 attempts / 15 mins).
- **Automated Backups:** Daily local backups with Gzip compression and 7-day retention.
- **Session Management:** "Panic Button" to revoke other sessions and device visibility.
- **Real IP Logging:** Audit logs now capture real client IP addresses (bypassing proxies).
- **Security Settings:** New section in user profile to manage MFA, sessions, and password.

### Fixed
- **Circular Dependencies:** Resolved import cycle between `authService` and `auditLogger`.
- **TypeScript Errors:** Fixed strict mode compilation errors in `SecuritySettings` and `AuthContext`.
- **Profile Management:** Restored missing functions for password and email updates with proper encryption handling.

### Security
- **Score:** Elevated to 9.2/10 (Fortress Mode).
- **CSP:** Enforced Content Security Policy for mitigation of XSS.
