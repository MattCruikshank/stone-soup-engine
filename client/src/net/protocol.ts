import { encode, decode } from '@msgpack/msgpack';

// Client -> Server
export const MSG_MOVE_TO_TARGET = 0x01;

// Server -> Client
export const MSG_WELCOME = 0x81;
export const MSG_GAME_STATE = 0x82;
export const MSG_PLAYER_JOINED = 0x83;
export const MSG_PLAYER_LEFT = 0x84;

export function encodeMessage(type: number, payload: unknown): Uint8Array {
    const body = encode(payload);
    const msg = new Uint8Array(1 + body.length);
    msg[0] = type;
    msg.set(body, 1);
    return msg;
}

export function decodeMessage(data: Uint8Array): { type: number; payload: unknown } {
    const type = data[0];
    const payload = decode(data.subarray(1));
    return { type, payload };
}

// Server message payload types
export interface WelcomePayload {
    playerId: number;
    displayName: string;
}

export interface EntityState {
    entityId: number;
    x: number;
    y: number;
    templateId: string;
    displayName: string;
}

export interface GameStatePayload {
    tick: number;
    entities: EntityState[];
}

// Parse MessagePack arrays into typed objects
export function parseWelcome(payload: unknown): WelcomePayload {
    const arr = payload as [number, string];
    return { playerId: arr[0], displayName: arr[1] };
}

export function parseGameState(payload: unknown): GameStatePayload {
    const arr = payload as [number, unknown[]];
    return {
        tick: arr[0],
        entities: (arr[1] ?? []).map((e) => {
            const ea = e as [number, number, number, string, string];
            return { entityId: ea[0], x: ea[1], y: ea[2], templateId: ea[3], displayName: ea[4] };
        }),
    };
}

export function parseEntityId(payload: unknown): number {
    const arr = payload as [number];
    return arr[0];
}
