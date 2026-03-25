import { Assets } from 'pixi.js';
import { createApp } from './render/renderer';
import { createFallbackTilemap, createSpriteTilemap } from './render/tilemap';
import { updateEntityGraphics, setPlayerTexture } from './render/entities';
import { connect } from './net/connection';
import {
    MSG_WELCOME,
    MSG_GAME_STATE,
    MSG_PLAYER_LEFT,
    parseWelcome,
    parseGameState,
    parseEntityId,
} from './net/protocol';
import { ClientWorld } from './game/world';
import { setupInput } from './input/input';
import { showLoginScreen } from './ui/LoginScreen';

const ASSET_BASE = '/assets';

async function loadGameConfig(): Promise<{ background?: string; player?: string }> {
    try {
        const res = await fetch(`${ASSET_BASE}/resources/default.json`);
        if (res.ok) return res.json();
    } catch { }
    return {};
}

async function main() {
    // Show login screen first
    const auth = await showLoginScreen();
    console.log('Logged in as:', auth.displayName, 'namespace:', auth.namespace);

    const app = await createApp();

    // Load game config
    const config = await loadGameConfig();

    // Load background
    if (config.background) {
        try {
            const bgTexture = await Assets.load(`${ASSET_BASE}/sprites/${config.background}`);
            app.stage.addChild(createSpriteTilemap(bgTexture));
        } catch {
            app.stage.addChild(createFallbackTilemap());
        }
    } else {
        app.stage.addChild(createFallbackTilemap());
    }

    // Load player sprite
    if (config.player) {
        try {
            const playerTex = await Assets.load(`${ASSET_BASE}/sprites/${config.player}`);
            setPlayerTexture(playerTex);
        } catch { }
    }

    // Connect directly to game server port — Vite's WS proxy doesn't work
    // through the exe.dev HTTPS reverse proxy. Cookie is shared across ports
    // on the same hostname.
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${window.location.hostname}:5000/ws`;
    const ws = connect(wsUrl);

    const world = new ClientWorld();

    ws.onMessage((type, payload) => {
        switch (type) {
            case MSG_WELCOME: {
                const welcome = parseWelcome(payload);
                world.localPlayerId = welcome.playerId;
                console.log('Welcome! Player ID:', welcome.playerId, 'as', welcome.displayName);
                break;
            }
            case MSG_GAME_STATE: {
                const state = parseGameState(payload);
                world.applySnapshot(state);
                break;
            }
            case MSG_PLAYER_LEFT: {
                const entityId = parseEntityId(payload);
                world.removeEntity(entityId);
                break;
            }
        }
    });

    setupInput(app.canvas as HTMLCanvasElement, ws, app.stage);

    app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        world.interpolate(dt);
        updateEntityGraphics(app.stage, world);

        const local = world.entities.get(world.localPlayerId);
        if (local) {
            app.stage.x = app.screen.width / 2 - local.renderX;
            app.stage.y = app.screen.height / 2 - local.renderY;
        }
    });
}

main().catch(console.error);
