using System.Collections.Concurrent;
using System.Diagnostics;
using Arch.Core;
using StoneSoup.Server.Net;
using StoneSoup.Server.Systems;

namespace StoneSoup.Server;

public class GameLoop : BackgroundService
{
    private const int TickRate = 20;
    private const float TickInterval = 1f / TickRate;

    private readonly World _world;
    private readonly SessionManager _sessionManager;
    private readonly MessageRouter _messageRouter;
    private readonly MovementSystem _movementSystem;
    private readonly BroadcastSystem _broadcastSystem;
    private readonly ConcurrentQueue<(string ConnectionId, byte[] Data, int Length)> _inputQueue;
    private readonly ILogger<GameLoop> _logger;

    private uint _tick;

    public GameLoop(
        World world,
        SessionManager sessionManager,
        MessageRouter messageRouter,
        ConcurrentQueue<(string ConnectionId, byte[] Data, int Length)> inputQueue,
        ILogger<GameLoop> logger)
    {
        _world = world;
        _sessionManager = sessionManager;
        _messageRouter = messageRouter;
        _inputQueue = inputQueue;
        _logger = logger;

        _movementSystem = new MovementSystem(world);
        _broadcastSystem = new BroadcastSystem(world, sessionManager);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Game loop started at {TickRate} ticks/sec", TickRate);

        var stopwatch = Stopwatch.StartNew();
        var lastTick = stopwatch.Elapsed.TotalSeconds;

        while (!stoppingToken.IsCancellationRequested)
        {
            var tickStart = stopwatch.Elapsed.TotalSeconds;

            // Drain input queue
            while (_inputQueue.TryDequeue(out var input))
            {
                _messageRouter.Route(input.ConnectionId, input.Data, input.Length);
            }

            // Run systems
            lock (_world)
            {
                _movementSystem.Update(TickInterval);
                _broadcastSystem.Update(_tick);
            }

            _tick++;

            // Sleep until next tick
            var elapsed = stopwatch.Elapsed.TotalSeconds - tickStart;
            var sleepTime = TickInterval - elapsed;
            if (sleepTime > 0)
            {
                await Task.Delay(TimeSpan.FromSeconds(sleepTime), stoppingToken);
            }
        }

        _logger.LogInformation("Game loop stopped");
    }
}
