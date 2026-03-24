import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { ClientWorld } from '../game/world';

const ENTITY_SIZE = 32;
const LOCAL_COLOR = 0x4fc3f7;
const OTHER_COLOR = 0xef5350;

const entitySprites = new Map<number, Sprite | Graphics>();

let playerTexture: Texture | null = null;

export function setPlayerTexture(texture: Texture): void {
    playerTexture = texture;
}

export function updateEntityGraphics(stage: Container, world: ClientWorld): void {
    const alive = new Set<number>();

    for (const entity of world.entities.values()) {
        alive.add(entity.entityId);

        let gfx = entitySprites.get(entity.entityId);
        if (!gfx) {
            if (playerTexture) {
                const sprite = new Sprite(playerTexture);
                sprite.anchor.set(0.5, 0.5);
                gfx = sprite;
            } else {
                const isLocal = entity.entityId === world.localPlayerId;
                const rect = new Graphics();
                rect.rect(-ENTITY_SIZE / 2, -ENTITY_SIZE / 2, ENTITY_SIZE, ENTITY_SIZE);
                rect.fill(isLocal ? LOCAL_COLOR : OTHER_COLOR);
                gfx = rect;
            }
            entitySprites.set(entity.entityId, gfx);
            stage.addChild(gfx);
        }

        gfx.x = entity.renderX;
        gfx.y = entity.renderY;
    }

    for (const [id, gfx] of entitySprites) {
        if (!alive.has(id)) {
            stage.removeChild(gfx);
            gfx.destroy();
            entitySprites.delete(id);
        }
    }
}
