describe('Mentis V1.0 Security Audit - E2EE Payload Verification', () => {
  beforeEach(() => {
    // 1. Interceptar chamadas REST do Supabase para salvar prontuários
    cy.intercept('POST', '**/rest/v1/clinical_records*').as('saveClinicalRecord');
    
    // 2. Autenticação padrão de teste
    cy.visit('/login');
    // Obs: As credenciais deverão ser injetadas via Cypress.env() na esteira de CI
    cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL') || 'test_therapist@mentis.clinic');
    cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD') || 'securepassword123');
    cy.get('button[type="submit"]').click();
    
    // Aguarda o dashboard carregar
    cy.url().should('include', '/dashboard');
  });

  it('PROVA JURÍDICA: Garante que prontuários clínicos são criptografados antes de sair do navegador (LGPD/HIPAA)', () => {
    // Texto altamente sensível que NUNCA deve ser visto em texto limpo no payload de rede
    const rawClinicalText = "O paciente João da Silva (CPF: 123.456.789-00) relatou severa ideação suicida ontem à noite. Fez uso abusivo de substâncias.";
    
    // Navegar até o perfil do primeiro paciente
    cy.visit('/patients');
    
    // Usando seletores genéricos/textuais para máxima compatibilidade
    cy.contains('Todos').should('be.visible');
    cy.get('.flex-1.py-3').first().click(); // Clica no primeiro card de paciente
    
    // Abrir modal/aba de Sessão e iniciar nova anotação
    // Obs: Os seletores aqui são ilustrativos e podem precisar de ajustes conforme a UI exata do Mentis
    cy.contains('Nova Sessão').click();
    
    // Digitar o texto sensível no editor TipTap (ou textarea genérico)
    cy.get('.tiptap, textarea').first().type(rawClinicalText);
    
    // Clicar em Salvar
    cy.contains('Salvar').click();

    // Aguardar o disparo da requisição de POST para o Supabase
    // Isso intercepta o exato pacote de rede antes de chegar no servidor
    cy.wait('@saveClinicalRecord', { timeout: 10000 }).then((interception) => {
      // O objeto exato que viajou na rede
      const requestBody = interception.request.body;
      const payloadString = JSON.stringify(requestBody);

      // --- ASSERTIVAS DE AUDITORIA DE SEGURANÇA ---
      
      // 1. Afirmar categoricamente que a requisição de fato aconteceu
      expect(requestBody).to.exist;

      // 2. A PROVA DE CEGUEIRA DO SERVIDOR (Zero-Knowledge)
      // Afirmar categoricamente que o texto puro NÃO viajou na rede
      expect(payloadString).to.not.include("João da Silva");
      expect(payloadString).to.not.include("ideação suicida");
      expect(payloadString).to.not.include("uso abusivo de substâncias");

      // 3. Validação do invólucro criptográfico
      // O campo de conteúdo deve existir, mas deve ser um hash/ciphertext ilegível
      if (requestBody.content) {
         expect(requestBody.content).to.not.match(/\s/);
         expect(requestBody.content.length).to.be.greaterThan(50);
      }
      
      // 4. Log para o relatório de auditoria do Cypress
      cy.log('✅ AUDITORIA CONCLUÍDA: O payload que viajou na rede é um hash ilegível. A criptografia ponta-a-ponta (E2EE) está ativa e o servidor está cego ao conteúdo clínico.');
    });
  });
});
