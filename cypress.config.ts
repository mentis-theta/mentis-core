import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000', // Assuming Vite port, adjust if needed
        supportFile: false,
        defaultCommandTimeout: 10000,
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});
