using System.Collections.Concurrent;
using System.Net.WebSockets;
using Arch.Core;
using StoneSoup.Server;
using StoneSoup.Server.Net;

var builder = WebApplication.CreateBuilder(args);

// ECS World
var world = World.Create();
builder.Services.AddSingleton(world);

// Input queue (WebSocket receive -> game loop)
var inputQueue = new ConcurrentQueue<(string ConnectionId, byte[] Data, int Length)>();
builder.Services.AddSingleton(inputQueue);

// Session management
builder.Services.AddSingleton<SessionManager>();
builder.Services.AddSingleton<MessageRouter>();

// Game loop
builder.Services.AddHostedService<GameLoop>();

var app = builder.Build();

app.UseWebSockets();

app.Map("/ws", async (HttpContext context, SessionManager sessionManager, ConcurrentQueue<(string, byte[], int)> queue) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    var ws = await context.WebSockets.AcceptWebSocketAsync();
    var connectionId = Guid.NewGuid().ToString();

    var entity = sessionManager.OnConnect(connectionId, ws);
    app.Logger.LogInformation("Player connected: {ConnectionId} -> Entity {EntityId}", connectionId, entity.Id);

    try
    {
        await WebSocketHandler.ReceiveLoop(ws, connectionId, queue, context.RequestAborted);
    }
    finally
    {
        sessionManager.OnDisconnect(connectionId);
        app.Logger.LogInformation("Player disconnected: {ConnectionId}", connectionId);

        if (ws.State == WebSocketState.Open)
        {
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Goodbye", CancellationToken.None);
        }
    }
});

app.Run("http://0.0.0.0:5000");
