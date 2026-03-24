using System.Collections.Concurrent;
using System.Net.WebSockets;
using Arch.Core;
using Microsoft.Extensions.FileProviders;
using StoneSoup.Server;
using StoneSoup.Server.Net;
using StoneSoup.Server.Services;

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

// Asset service
var assetRoot = Path.Combine(builder.Environment.ContentRootPath, "custom-assets");
var assetService = new AssetService(assetRoot);
builder.Services.AddSingleton(assetService);

// CORS for editor
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Game loop
builder.Services.AddHostedService<GameLoop>();

var app = builder.Build();

app.UseCors();
app.UseWebSockets();

// Serve custom-assets/ at /assets/
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(assetRoot),
    RequestPath = "/assets"
});

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

// Asset API
app.MapGet("/api/assets", (AssetService assets) =>
{
    return Results.Ok(assets.GetFileTree());
});

app.MapGet("/api/assets/{**path}", (string path, AssetService assets) =>
{
    var data = assets.ReadFile(path);
    if (data == null) return Results.NotFound();
    return Results.File(data, AssetService.GetContentType(path));
});

app.MapPut("/api/assets/{**path}", async (string path, HttpRequest request, AssetService assets) =>
{
    using var ms = new MemoryStream();
    await request.Body.CopyToAsync(ms);
    var success = assets.WriteFile(path, ms.ToArray());
    return success ? Results.Ok() : Results.BadRequest("Invalid path");
});

app.MapDelete("/api/assets/{**path}", (string path, AssetService assets) =>
{
    return assets.DeleteFile(path) ? Results.Ok() : Results.NotFound();
});

app.Run("http://0.0.0.0:5000");
