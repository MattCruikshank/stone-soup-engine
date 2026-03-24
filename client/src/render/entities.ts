import { Container, Graphics } from 'pixi.js';
import type { ClientWorld } from '../game/world';

const ENTITY_SIZE = 32;
const LOCAL_COLOR = 0x4fc3f7; // light blue
const OTHER_COLOR = 0xef5350; // red

const sprites = new Map<number, Graphics>();

export function updateEntityGraphics(stage: Container, world: ClientWorld): void {
    const alive = new Set<number>();

    for (const entity of world.entities.values()) {
        alive.add(entity.entityId);

        let gfx = sprites.get(entity.entityId);
        if (!gfx) {
            const isLocal = entity.entityId === world.localPlayerId;
            gfx = new Graphics();
            gfx.rect(
                -ENTITY_SIZE / 2,
                -ENTITY_SIZE / 2,
                ENTITY_SIZE,
                ENTITY_SIZE,
            );
            gfx.fill(isLocal ? LOCAL_COLOR : OTHER_COLOR);
            sprites.set(entity.entityId, gfx);
            stage.addChild(gfx);
        }

        gfx.x = entity.renderX;
        gfx.y = entity.renderY;
    }

    // Remove graphics for despawned entities
    for (const [id, gfx] of sprites) {
        if (!alive.has(id)) {
            stage.removeChild(gfx);
            gfx.destroy();
            sprites.delete(id);
        }
    }
}
