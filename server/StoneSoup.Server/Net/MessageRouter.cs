using Arch.Core;
using StoneSoup.Server.Components;
using StoneSoup.Server.Protocol;

namespace StoneSoup.Server.Net;

public class MessageRouter
{
    private readonly World _world;
    private readonly SessionManager _sessionManager;

    public MessageRouter(World world, SessionManager sessionManager)
    {
        _world = world;
        _sessionManager = sessionManager;
    }

    public void Route(string connectionId, byte[] data, int length)
    {
        if (length < 2) return;

        var (type, payload) = MessageEnvelope.Decode(data, length);

        switch (type)
        {
            case MessageType.MoveToTarget:
                HandleMoveToTarget(connectionId, payload);
                break;
        }
    }

    private void HandleMoveToTarget(string connectionId, ReadOnlyMemory<byte> payload)
    {
        var msg = MessageEnvelope.DeserializePayload<MoveToTargetMsg>(payload);
        var entity = _sessionManager.GetEntityForConnection(connectionId);
        if (entity is null) return;

        var e = entity.Value;
        if (_world.Has<MoveTarget>(e))
        {
            _world.Set(e, new MoveTarget { X = msg.X, Y = msg.Y });
        }
        else
        {
            _world.Add(e, new MoveTarget { X = msg.X, Y = msg.Y });
        }
    }
}
