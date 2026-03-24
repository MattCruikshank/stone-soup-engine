import { Container } from 'pixi.js';
import type { Connection } from '../net/connection';
import { MSG_MOVE_TO_TARGET } from '../net/protocol';

export function setupInput(canvas: HTMLCanvasElement, ws: Connection, stage: Container): void {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        // Convert screen coords to world coords using stage offset
        const worldX = e.clientX - rect.left - stage.x;
        const worldY = e.clientY - rect.top - stage.y;
        ws.send(MSG_MOVE_TO_TARGET, [worldX, worldY]);
    });
}
