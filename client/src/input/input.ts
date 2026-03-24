import type { Connection } from '../net/connection';
import { MSG_MOVE_TO_TARGET } from '../net/protocol';

export function setupInput(canvas: HTMLCanvasElement, ws: Connection): void {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ws.send(MSG_MOVE_TO_TARGET, [x, y]);
    });
}
