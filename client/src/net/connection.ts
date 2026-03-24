import { encodeMessage, decodeMessage } from './protocol';

export type MessageCallback = (type: number, payload: unknown) => void;

export interface Connection {
    send(type: number, payload: unknown): void;
    onMessage(callback: MessageCallback): void;
    close(): void;
}

export function connect(url: string): Connection {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    let messageCallback: MessageCallback | null = null;

    ws.addEventListener('open', () => {
        console.log('Connected to server');
    });

    ws.addEventListener('message', (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        const { type, payload } = decodeMessage(data);
        messageCallback?.(type, payload);
    });

    ws.addEventListener('close', () => {
        console.log('Disconnected from server');
    });

    ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
    });

    return {
        send(type: number, payload: unknown) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(encodeMessage(type, payload));
            }
        },
        onMessage(callback: MessageCallback) {
            messageCallback = callback;
        },
        close() {
            ws.close();
        },
    };
}
