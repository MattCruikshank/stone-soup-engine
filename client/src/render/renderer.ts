import { Application } from 'pixi.js';

export async function createApp(): Promise<Application> {
    const app = new Application();
    await app.init({
        background: '#1a1a2e',
        resizeTo: window,
        antialias: false,
    });

    const container = document.getElementById('app');
    if (!container) throw new Error('No #app element found');
    container.appendChild(app.canvas);

    return app;
}
