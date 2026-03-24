import { Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';

const TILE_SIZE = 32;
const MAP_WIDTH = 50; // tiles
const MAP_HEIGHT = 50;

const COLOR_A = 0x2d5a27;
const COLOR_B = 0x3a7a33;

export function createFallbackTilemap(): Container {
    const container = new Container();
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const color = (x + y) % 2 === 0 ? COLOR_A : COLOR_B;
            const tile = new Graphics();
            tile.rect(0, 0, TILE_SIZE, TILE_SIZE);
            tile.fill(color);
            tile.x = x * TILE_SIZE;
            tile.y = y * TILE_SIZE;
            container.addChild(tile);
        }
    }
    return container;
}

export function createSpriteTilemap(texture: Texture): Container {
    const container = new Container();
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;

    // Tile the background sprite across the world
    for (let y = 0; y < worldH; y += texture.height) {
        for (let x = 0; x < worldW; x += texture.width) {
            const sprite = new Sprite(texture);
            sprite.x = x;
            sprite.y = y;
            container.addChild(sprite);
        }
    }
    return container;
}

export const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;
