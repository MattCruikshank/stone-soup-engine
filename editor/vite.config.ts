import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5174,
        allowedHosts: ['stone-soup-mmo.exe.xyz'],
        hmr: {
            host: 'stone-soup-mmo.exe.xyz',
            port: 5174,
            protocol: 'wss',
        },
        proxy: {
            '/api': { target: 'http://localhost:5000' },
            '/assets': { target: 'http://localhost:5000' },
        },
    },
});
