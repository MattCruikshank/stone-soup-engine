import type { GameStatePayload } from '../net/protocol';

export interface ClientEntity {
    entityId: number;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    renderX: number;
    renderY: number;
    templateId: string;
    displayName: string;
}

const TICK_INTERVAL = 1 / 20; // 50ms

export class ClientWorld {
    entities = new Map<number, ClientEntity>();
    localPlayerId = 0;
    private snapshotTime = 0;

    applySnapshot(state: GameStatePayload): void {
        const seen = new Set<number>();

        for (const e of state.entities) {
            seen.add(e.entityId);
            const existing = this.entities.get(e.entityId);

            if (existing) {
                existing.prevX = existing.x;
                existing.prevY = existing.y;
                existing.x = e.x;
                existing.y = e.y;
                existing.templateId = e.templateId;
                existing.displayName = e.displayName;
            } else {
                this.entities.set(e.entityId, {
                    entityId: e.entityId,
                    x: e.x,
                    y: e.y,
                    prevX: e.x,
                    prevY: e.y,
                    renderX: e.x,
                    renderY: e.y,
                    templateId: e.templateId,
                    displayName: e.displayName,
                });
            }
        }

        // Remove entities no longer in snapshot
        for (const id of this.entities.keys()) {
            if (!seen.has(id)) {
                this.entities.delete(id);
            }
        }

        this.snapshotTime = 0;
    }

    removeEntity(entityId: number): void {
        this.entities.delete(entityId);
    }

    interpolate(dt: number): void {
        this.snapshotTime += dt;
        const t = Math.min(this.snapshotTime / TICK_INTERVAL, 1);

        for (const e of this.entities.values()) {
            e.renderX = e.prevX + (e.x - e.prevX) * t;
            e.renderY = e.prevY + (e.y - e.prevY) * t;
        }
    }
}
