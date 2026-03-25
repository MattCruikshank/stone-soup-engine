# Stone Soup Engine

## What's Built (Phase 1 complete + editor)

### Game Server (C# / ASP.NET Core) — port 5000
- Arch ECS with components: Position, Velocity, MoveTarget, TemplateRef, PlayerConnection, PlayerIdentity
- Fixed-rate game loop at 20 ticks/sec: drain inputs → movement system → broadcast state
- Server-authoritative: client sends MoveToTarget, server simulates and broadcasts
- WebSocket + MessagePack binary protocol for game state
- HTTP API for auth and asset management
- Assets stored as flat files in `custom-assets/` (no database yet)

### Game Client (TypeScript + PixiJS) — port 5173
- PixiJS 2D rendering with client-side interpolation between server ticks
- Click-to-move input (sends MoveToTarget to server)
- Login screen (register/login with password)
- Loads game config, background sprite, player sprites from asset API
- Multiplayer: all connected players see each other moving in real-time

### Asset Editor (React + dockview) — port 5173/editor.html
- VS Code-like workbench with dockview tabbed/split-pane layout
- File tree sidebar backed by server's custom-assets/ directory
- Three editor types, routed by file extension:
  - **Sprite editor** (Piskel fork, Apache-2.0) — `.png`, `.jpg`, `.gif` files
  - **Tilemap editor** (tilemap-editor fork, MIT) — `.tilemap.json` files
  - **Text/code editor** (CodeMirror 6) — `.json`, `.lua`, `.js`, `.txt`, etc.
- Load/save through HTTP asset API
- Auth-gated: requires login, shares session cookie with game client
- "New Sprite", "New Tilemap", "New JSON" buttons in sidebar

### Auth
- Cookie-based: server sets `ss_token` HttpOnly Secure cookie on login/register
- `/api/auth/me` checks session, `/api/auth/logout` clears it
- Both game client and editor share the session cookie (same origin)
- Asset write/delete endpoints require auth; reads are open
- WebSocket auth reads cookie (primary) or query string `?token=` (fallback)
- Passwords hashed with Argon2id
- Sessions are in-memory (lost on server restart)

### Tileset/Tilemap Workflow
- Tilesets are PNG sprite sheets drawn in Piskel (or any tool), saved as assets
- Tilemap editor loads one or more tilesets, lets you paint multi-layer maps
- Tilemap JSON references tilesets by relative asset path (e.g., `tilesets/terrain.png`)
- Individual sprites (characters, items, projectiles) are separate from tilesets

## What's NOT Built Yet

- **Persistence** — no PostgreSQL, all game state is in-memory
- **Lua scripting** — MoonSharp integration for gameplay logic
- **Template registry** — entity templates, asset manifest/lockfile pipeline
- **Action bar / skills / cooldowns** — actual gameplay mechanics
- **Pathfinding** — no obstacle avoidance, just move-toward-target
- **Interest management** — all entities broadcast to all clients
- **World generation** — WFC chunk composition from authored tilemaps
- **Governance** — voting system for asset/rule changes
- **Federations** — cross-server portable player state
- **OWNERS / namespace enforcement** — anyone can edit anything currently

## Development

- `./run.sh` starts the C# server (:5000) and Vite dev server (:5173). Kills previous processes on ports 5000/5173/5174 before starting.
- Server logs are written to `server.log` in the repo root.
- Client is a Vite multi-page app: game at `/`, editor at `/editor.html`.
- Uses `bun` as the JS runtime (not node/npm).
- Editor dependencies (React, dockview, CodeMirror) live in the client package.json — there is no separate editor package.

## exe.dev Hosting

This runs on an exe.dev VM. The exe.dev HTTPS proxy at `https://stone-soup-mmo.exe.xyz` terminates TLS and forwards to the VM.

- Ports 3000-9999 are transparently proxied: `https://stone-soup-mmo.exe.xyz:5000` reaches the C# server directly.
- **WebSocket proxying through Vite does not work** when behind the exe.dev reverse proxy. The Vite WS proxy (`/ws` -> localhost:5000) silently fails — the server accepts the connection but the browser never receives the upgrade response. The fix is to connect WebSockets directly to port 5000 (`wss://hostname:5000/ws`) instead of going through Vite's proxy. Cookies are shared across ports on the same hostname, so auth still works.
- HTTP API proxying through Vite (`/api`, `/assets`) works fine.
- Cookies must have `Secure: true` since all access is over HTTPS.

## Build

- C# server: `dotnet build` / `dotnet run` from `server/StoneSoup.Server/`
- Client+Editor: `bun install` then `bun run dev` (or `bun run build`) from `client/`
- Piskel sprite editor is bundled by `client/scripts/bundle-piskel.js` (runs automatically before dev/build).
- Tilemap editor is copied by `client/scripts/bundle-tilemap.js` (runs automatically before dev/build).

## Key Files

### Server
- `server/StoneSoup.Server/Program.cs` — entry point, endpoints, WebSocket handler
- `server/StoneSoup.Server/GameLoop.cs` — fixed-rate ECS game loop
- `server/StoneSoup.Server/Services/AuthService.cs` — registration, login, sessions
- `server/StoneSoup.Server/Services/AssetService.cs` — file CRUD for assets
- `server/StoneSoup.Server/Components/Components.cs` — ECS components
- `server/StoneSoup.Server/Systems/` — MovementSystem, BroadcastSystem

### Client
- `client/src/main.ts` — game client entry point
- `client/src/net/` — WebSocket connection + MessagePack protocol
- `client/src/game/world.ts` — client-side entity state + interpolation
- `client/src/render/` — PixiJS rendering (entities, tilemap)
- `client/src/ui/LoginScreen.ts` — game login UI

### Editor
- `client/src/editor/App.tsx` — dockview layout + auth gate + logout
- `client/src/editor/panels/FileTreePanel.tsx` — file browser + routing
- `client/src/editor/panels/SpriteEditorPanel.tsx` — Piskel dockview panel
- `client/src/editor/panels/TilemapEditorPanel.tsx` — tilemap dockview panel
- `client/src/editor/panels/TextEditorPanel.tsx` — CodeMirror dockview panel
- `client/src/editor/piskel/PiskelEditor.tsx` — Piskel React wrapper
- `client/src/editor/tilemap/TilemapEditor.tsx` — tilemap-editor React wrapper
- `client/src/editor/services/assetApi.ts` — asset CRUD API client
- `client/src/editor/services/authApi.ts` — auth API client
