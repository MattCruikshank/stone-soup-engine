import { defineConfig } from 'vite';

export default defineConfig({
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
        },
    },
});
