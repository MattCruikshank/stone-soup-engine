import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { ClientWorld } from '../game/world';

const ENTITY_SIZE = 32;
const LOCAL_COLOR = 0x4fc3f7;
const OTHER_COLOR = 0xef5350;

interface EntityVisual {
    container: Container;
    sprite: Sprite | Graphics;
    label: Text;
}

const entityVisuals = new Map<number, EntityVisual>();

let playerTexture: Texture | null = null;

const labelStyle = new TextStyle({
    fontSize: 12,
    fill: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    stroke: { color: '#000000', width: 3 },
    align: 'center',
});

export function setPlayerTexture(texture: Texture): void {
    playerTexture = texture;
}

export function updateEntityGraphics(stage: Container, world: ClientWorld): void {
    const alive = new Set<number>();

    for (const entity of world.entities.values()) {
        alive.add(entity.entityId);

        let visual = entityVisuals.get(entity.entityId);
        if (!visual) {
            const container = new Container();

            let sprite: Sprite | Graphics;
            if (playerTexture) {
                const s = new Sprite(playerTexture);
                s.anchor.set(0.5, 0.5);
                sprite = s;
            } else {
                const isLocal = entity.entityId === world.localPlayerId;
                const rect = new Graphics();
                rect.rect(-ENTITY_SIZE / 2, -ENTITY_SIZE / 2, ENTITY_SIZE, ENTITY_SIZE);
                rect.fill(isLocal ? LOCAL_COLOR : OTHER_COLOR);
                sprite = rect;
            }

            const label = new Text({ text: entity.displayName || '', style: labelStyle });
            label.anchor.set(0.5, 1);
            label.y = -ENTITY_SIZE / 2 - 4;

            container.addChild(sprite);
            container.addChild(label);

            visual = { container, sprite, label };
            entityVisuals.set(entity.entityId, visual);
            stage.addChild(container);
        }

        // Update label text if changed
        if (visual.label.text !== entity.displayName) {
            visual.label.text = entity.displayName;
        }

        visual.container.x = entity.renderX;
        visual.container.y = entity.renderY;
    }

    for (const [id, visual] of entityVisuals) {
        if (!alive.has(id)) {
            stage.removeChild(visual.container);
            visual.container.destroy({ children: true });
            entityVisuals.delete(id);
        }
    }
}
