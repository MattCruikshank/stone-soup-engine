# Stone Soup Engine

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

## Auth

- Cookie-based: server sets `ss_token` HttpOnly Secure cookie on login/register.
- `/api/auth/me` checks session, `/api/auth/logout` clears it.
- Both game client and editor share the session cookie (same origin).
- Asset write/delete endpoints require auth; reads are open.
- WebSocket auth reads cookie (primary) or query string `?token=` (fallback).

## Build

- C# server: `dotnet build` / `dotnet run` from `server/StoneSoup.Server/`
- Client+Editor: `bun install` then `bun run dev` (or `bun run build`) from `client/`
- Piskel sprite editor is bundled by `client/scripts/bundle-piskel.js` (runs automatically before dev/build).
