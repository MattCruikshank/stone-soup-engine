import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        allowedHosts: ['stone-soup-mmo.exe.xyz'],
        proxy: {
            '/ws': {
                target: 'http://localhost:5000',
                ws: true,
            },
        },
    },
});
