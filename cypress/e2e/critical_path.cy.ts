describe('Golden Path: Clinical Workflow', () => {
    const TEST_USER = 'gpentakill@gmail.com';
    const TEST_PASS = '123456789';
    const PATIENT_NAME = 'Paciente Automação ' + Date.now();

    it('Should login, create patient, record session, and generate document', () => {
        // --- STEP 1: LOGIN ---
        cy.visit('/login');
        cy.get('input[type="email"]').type(TEST_USER);
        cy.get('input[type="password"]').type(TEST_PASS);
        cy.contains('button', 'Entrar').click();

        // FIX: Wait for UI elements to prove login success (Dashboard loaded)
        // The App uses client-side state for routing, so checking just URL might not be enough or flaky.
        // We look for the dashboard greeting or sidebar.
        cy.contains('Bom dia', { timeout: 15000 }).should('be.visible');
        cy.contains('Pacientes').should('be.visible');

        // --- STEP 2: CREATE PATIENT ---
        // Navigation in this app is state-based, NOT URL-based for sub-views. 
        // We must click the sidebar item.
        cy.contains('Pacientes').click();

        // Wait for the Patient List view to load
        // "Selecione um paciente" might not exist if list is empty. 
        // We check for the "Novo Paciente" button which is present in both states (sidebar bottom or empty state hero).
        // Using a generous timeout to ensure view transition.
        cy.contains('button', 'Novo Paciente', { timeout: 10000 }).should('be.visible');

        // Find and click the "Add Patient" button. 
        // We prioritize the specialized empty state button if visible, otherwise the sidebar button.
        cy.get('body').then(($body) => {
            if ($body.find('button:contains("Cadastrar Primeiro Paciente")').is(':visible')) {
                cy.contains('button', 'Cadastrar Primeiro Paciente').click();
            } else {
                cy.contains('button', 'Novo Paciente').click();
            }
        });

        // Verify Modal appears
        cy.contains('Novo Paciente', { timeout: 5000 }).should('be.visible');

        // Fill Form
        cy.get('input[id="name"]').type(PATIENT_NAME);
        cy.get('input[id="cpf"]').type('000.000.000-00');
        cy.get('input[id="birthDate"]').type('2000-01-01'); // Required field
        cy.contains('button', 'Salvar Paciente').click();

        // Assert Patient Selected/Profile Open
        // The app usually selects the new patient automatically or we need to click them.
        // Let's search for the patient in the list and click if needed, or check if profile is open.
        cy.contains(PATIENT_NAME, { timeout: 10000 }).should('be.visible');
        cy.contains(PATIENT_NAME).click({ force: true }); // Ensure selected - Force click because element might have pointer-events: none

        // Collapse the sidebar to improve visibility and avoid overlapping
        // The button has a ChevronLeftIcon and is located in the sidebar header
        cy.get('aside button:has(svg)').filter(':visible').then($buttons => {
            // It's usually the one with the left chevron. 
            // We can look for the button that calls onToggleCollapse.
            // In the DOM it will just be a button with an SVG.
            // Let's try to find the one in the top right of the sidebar header.
            // Simpler: Just click the button that looks like a "Back" or "Collapse" arrow in the aside.
            cy.wrap($buttons).last().click(); // Assuming it's often the last one in the header row
        });

        // --- STEP 3: CLINICAL CONTEXT (ANAMNESE) ---
        // Navigate to Anamnese tab
        cy.contains('Anamnese').click();

        // Wait for title
        cy.contains('h3', 'Anamnese Estruturada', { timeout: 10000 }).should('be.visible');

        // Click "Editar Anamnese" to enable form
        // We use force:true just in case it's animating or partially covered, though it shouldn't be.
        cy.contains('button', 'Editar Anamnese').click();

        // Fill Diagnosis & Meds - Using IDs based on AnamnesisTab implementation: anamnesis-FIELDNAME
        // But since we are using cy.get('textarea[name="..."]'), let's check if the component sets name. 
        // Component Textarea uses {...props}, so name should be there if passed?
        // Actually AnamnesisTab renderField uses:
        // onChange={(e) => handleChange(field, e.target.value)}
        // it does NOT pass 'name' prop explicitly to Textarea. 
        // However, it sets ID=`anamnesis-${field}`. 
        // So we should use ID selector.
        cy.get('#anamnesis-diagnosticHypothesis').clear().type('Ansiedade Generalizada (Teste Bot)');
        cy.get('#anamnesis-medications').clear().type('Valium 10mg');
        cy.contains('button', 'Salvar Alterações').click();

        // Verification
        cy.contains('Ansiedade Generalizada (Teste Bot)').should('be.visible');

        // --- STEP 4: SESSION ---
        cy.contains('button', 'Sessões').click();
        cy.contains('button', 'Nova Sessão').click();

        // Fill session details
        // Wait for modal
        cy.contains('Nova Sessão', { timeout: 5000 }).should('be.visible');

        // Use a more specific selector if possible, or force typing into the editor
        cy.get('div[contenteditable="true"]').first().type('Sessão de teste automatizado Cypress.');

        cy.contains('button', 'Salvar Sessão').click();

        // Verification - wait for modal to close and list to update
        cy.contains('Sessão de teste automatizado').should('be.visible');

        // --- STEP 5: GENERATE DOCUMENT ---
        cy.contains('button', 'Documentos').click();
        cy.contains('button', 'Gerar Documento').click();

        // 5a. Verify Context Panel
        cy.contains('Resumo Clínico', { timeout: 5000 }).should('be.visible');
        cy.contains('Valium 10mg').should('be.visible');

        // 5b. Interact (Click-to-Insert)
        cy.contains('div', 'Valium 10mg').click();

        // 5c. Generate PDF
        cy.contains('button', 'Gerar Documento (PDF)').click();

        // Check for success toast
        cy.contains('Documento gerado', { timeout: 10000 }).should('be.visible');
    });
});
