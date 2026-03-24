import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                editor: resolve(__dirname, 'editor.html'),
            },
        },
    },
    server: {
        host: '0.0.0.0',
        allowedHosts: ['stone-soup-mmo.exe.xyz'],
        hmr: {
            host: 'stone-soup-mmo.exe.xyz',
            port: 5173,
            protocol: 'wss',
        },
        proxy: {
            '/ws': {
                target: 'http://localhost:5000',
                ws: true,
            },
            '/assets': {
                target: 'http://localhost:5000',
            },
            '/api': {
                target: 'http://localhost:5000',
            },
        },
    },
});
