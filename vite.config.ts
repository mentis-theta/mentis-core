/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    publicDir: 'public',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/'),
              handler: 'NetworkOnly',
            }
          ]
        },
        manifest: {
          name: "Mentis | Gestão Clínica",
          short_name: "Mentis",
          start_url: "./index.html",
          scope: "./",
          display: "standalone",
          background_color: "#f1f5f9",
          theme_color: "#0f172a",
          description: "Gestão inteligente para psicólogos.",
          orientation: "any",
          icons: [
            {
              src: "/icon.svg",
              type: "image/svg+xml",
              sizes: "any"
            },
            {
              src: "/icon.svg",
              type: "image/svg+xml",
              sizes: "192x192",
              purpose: "maskable"
            },
            {
              src: "/icon.svg",
              type: "image/svg+xml",
              sizes: "512x512",
              purpose: "any"
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
            'vendor-charts': ['recharts'],
            'vendor-crypto': ['crypto-js'],
            'vendor-dates': ['date-fns'],
          }
        }
      }
    }
  };
});
