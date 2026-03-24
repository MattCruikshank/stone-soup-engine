import { Assets, Texture } from 'pixi.js';
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

const ASSET_BASE = '/assets';

async function loadGameConfig(): Promise<{ background?: string; player?: string }> {
    try {
        const res = await fetch(`${ASSET_BASE}/resources/default.json`);
        if (res.ok) return res.json();
    } catch {
        // Config not available, use defaults
    }
    return {};
}

async function main() {
    const app = await createApp();

    // Load game config
    const config = await loadGameConfig();
    console.log('Game config:', config);

    // Load background
    if (config.background) {
        try {
            const bgTexture = await Assets.load(`${ASSET_BASE}/sprites/${config.background}`);
            const tilemap = createSpriteTilemap(bgTexture);
            app.stage.addChild(tilemap);
        } catch (e) {
            console.warn('Failed to load background sprite, using fallback:', e);
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
            console.log('Player sprite loaded:', config.player);
        } catch (e) {
            console.warn('Failed to load player sprite, using fallback:', e);
        }
    }

    // Connect to server
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname;
    const wsPort = 5000;
    const wsUrl = `${wsProto}://${wsHost}:${wsPort}/ws`;
    const ws = connect(wsUrl);

    const world = new ClientWorld();

    ws.onMessage((type, payload) => {
        switch (type) {
            case MSG_WELCOME: {
                const welcome = parseWelcome(payload);
                world.localPlayerId = welcome.playerId;
                console.log('Welcome! Player ID:', welcome.playerId);
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

        // Camera follow
        const local = world.entities.get(world.localPlayerId);
        if (local) {
            app.stage.x = app.screen.width / 2 - local.renderX;
            app.stage.y = app.screen.height / 2 - local.renderY;
        }
    });
}

main().catch(console.error);
