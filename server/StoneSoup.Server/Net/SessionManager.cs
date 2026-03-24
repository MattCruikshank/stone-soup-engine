using System.Collections.Concurrent;
using System.Net.WebSockets;
using Arch.Core;
using StoneSoup.Server.Components;
using StoneSoup.Server.Protocol;

namespace StoneSoup.Server.Net;

public class SessionManager
{
    private readonly World _world;
    private readonly ConcurrentDictionary<string, (Entity Entity, WebSocket Socket)> _sessions = new();
    private readonly Random _rng = new();

    public SessionManager(World world)
    {
        _world = world;
    }

    public Entity OnConnect(string connectionId, WebSocket socket)
    {
        var spawnX = 100f + (float)(_rng.NextDouble() * 1400);
        var spawnY = 100f + (float)(_rng.NextDouble() * 1400);

        Entity entity;
        lock (_world)
        {
            entity = _world.Create(
                new Position { X = spawnX, Y = spawnY },
                new Velocity { Dx = 0, Dy = 0 },
                new PlayerConnection { ConnectionId = connectionId },
                new TemplateRef { TemplateId = "player" }
            );
        }

        _sessions[connectionId] = (entity, socket);

        // Send Welcome to the new player
        var welcome = MessageEnvelope.Encode(MessageType.Welcome, new WelcomeMsg(entity.Id));
        _ = SendAsync(socket, welcome);

        // Broadcast PlayerJoined to others
        var joined = MessageEnvelope.Encode(MessageType.PlayerJoined, new PlayerJoinedMsg(entity.Id));
        BroadcastExcept(connectionId, joined);

        return entity;
    }

    public void OnDisconnect(string connectionId)
    {
        if (_sessions.TryRemove(connectionId, out var session))
        {
            var leftMsg = MessageEnvelope.Encode(MessageType.PlayerLeft, new PlayerLeftMsg(session.Entity.Id));
            BroadcastExcept(connectionId, leftMsg);

            lock (_world)
            {
                _world.Destroy(session.Entity);
            }
        }
    }

    public Entity? GetEntityForConnection(string connectionId)
    {
        if (_sessions.TryGetValue(connectionId, out var session))
            return session.Entity;
        return null;
    }

    public IEnumerable<(string ConnectionId, WebSocket Socket)> GetAllSockets()
    {
        foreach (var kvp in _sessions)
            yield return (kvp.Key, kvp.Value.Socket);
    }

    public void Broadcast(byte[] data)
    {
        foreach (var kvp in _sessions)
        {
            if (kvp.Value.Socket.State == WebSocketState.Open)
                _ = SendAsync(kvp.Value.Socket, data);
        }
    }

    private void BroadcastExcept(string excludeId, byte[] data)
    {
        foreach (var kvp in _sessions)
        {
            if (kvp.Key != excludeId && kvp.Value.Socket.State == WebSocketState.Open)
                _ = SendAsync(kvp.Value.Socket, data);
        }
    }

    private static async Task SendAsync(WebSocket socket, byte[] data)
    {
        try
        {
            if (socket.State == WebSocketState.Open)
            {
                await socket.SendAsync(
                    new ArraySegment<byte>(data),
                    WebSocketMessageType.Binary,
                    true,
                    CancellationToken.None);
            }
        }
        catch (WebSocketException)
        {
            // Connection already closed, ignore
        }
    }
}
