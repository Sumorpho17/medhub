import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        // API calls — network first, fallback to cache only for reads
                        urlPattern: /^https?.+\/api\/v1\/.+/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                        },
                    },
                ],
            },
            manifest: {
                name: 'MEDHUB HMS',
                short_name: 'MEDHUB',
                description: 'Clinical-grade offline-first Hospital Management System',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait-primary',
                icons: [
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                ],
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
        }),
    ],
    resolve: {
        alias: {
            '@medhub/shared': path.resolve(__dirname, '../shared/src/index.ts'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
