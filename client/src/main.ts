import { createApp } from './render/renderer';
import { createTilemap } from './render/tilemap';
import { updateEntityGraphics } from './render/entities';
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

async function main() {
    const app = await createApp();

    // Add tilemap background
    const tilemap = createTilemap();
    app.stage.addChild(tilemap);

    // Connect to server — use port 5000 directly (game server)
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

    // Setup click-to-move input (needs stage ref for screen->world conversion)
    setupInput(app.canvas as HTMLCanvasElement, ws, app.stage);

    // Render loop
    app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        world.interpolate(dt);
        updateEntityGraphics(app.stage, world);

        // Camera follow: center stage on local player
        const local = world.entities.get(world.localPlayerId);
        if (local) {
            app.stage.x = app.screen.width / 2 - local.renderX;
            app.stage.y = app.screen.height / 2 - local.renderY;
        }
    });
}

main().catch(console.error);
