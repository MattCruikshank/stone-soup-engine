#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo "Shutting down..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    kill $EDITOR_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start C# server in background
echo "Starting server on :5000..."
cd "$SCRIPT_DIR/server/StoneSoup.Server"
dotnet run &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Start game client
echo "Starting client on :5173..."
cd "$SCRIPT_DIR/client"
bun run dev &
CLIENT_PID=$!

# Start asset editor
echo "Starting editor on :5174..."
cd "$SCRIPT_DIR/editor"
bun run dev &
EDITOR_PID=$!

echo ""
echo "==================================="
echo "  Stone Soup Engine"
echo "  Game:   http://localhost:5173"
echo "  Editor: http://localhost:5174"
echo "  Press Ctrl+C to stop"
echo "==================================="
echo ""

wait
