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

// Auth service
var authService = new AuthService(assetRoot);
builder.Services.AddSingleton(authService);

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

// Serve custom-assets/ at /assets/ with no caching
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(assetRoot),
    RequestPath = "/assets",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        ctx.Context.Response.Headers["Pragma"] = "no-cache";
        ctx.Context.Response.Headers["Expires"] = "0";
    }
});

app.Map("/ws", async (HttpContext context, SessionManager sessionManager, AuthService auth, ConcurrentQueue<(string, byte[], int)> queue) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    // Validate auth token from query string
    var token = context.Request.Query["token"].FirstOrDefault();
    var identity = auth.ValidateToken(token);
    if (identity == null)
    {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsync("Invalid or missing auth token");
        return;
    }

    var ws = await context.WebSockets.AcceptWebSocketAsync();
    var connectionId = Guid.NewGuid().ToString();

    var entity = sessionManager.OnConnect(connectionId, ws, identity.Value.Namespace, identity.Value.DisplayName);
    app.Logger.LogInformation("Player {DisplayName} connected: {ConnectionId} -> Entity {EntityId}",
        identity.Value.DisplayName, connectionId, entity.Id);

    try
    {
        await WebSocketHandler.ReceiveLoop(ws, connectionId, queue, context.RequestAborted);
    }
    finally
    {
        sessionManager.OnDisconnect(connectionId);
        auth.RemoveToken(token!);
        app.Logger.LogInformation("Player {DisplayName} disconnected: {ConnectionId}",
            identity.Value.DisplayName, connectionId);

        if (ws.State == WebSocketState.Open)
        {
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Goodbye", CancellationToken.None);
        }
    }
});

// Auth API
app.MapPost("/api/auth/register", async (HttpRequest request, AuthService auth) =>
{
    var body = await request.ReadFromJsonAsync<AuthRequest>();
    if (body == null) return Results.BadRequest("Invalid request body");

    var result = await auth.Register(body.DisplayName, body.Password);
    if (!result.Success) return Results.BadRequest(new { error = result.Error });

    return Results.Ok(new { @namespace = result.Namespace, token = result.Token });
});

app.MapPost("/api/auth/login", async (HttpRequest request, AuthService auth) =>
{
    var body = await request.ReadFromJsonAsync<AuthRequest>();
    if (body == null) return Results.BadRequest("Invalid request body");

    var result = await auth.Login(body.DisplayName, body.Password);
    if (!result.Success) return Results.Json(new { error = result.Error }, statusCode: 401);

    return Results.Ok(new { @namespace = result.Namespace, token = result.Token });
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

record AuthRequest(string DisplayName, string Password);
