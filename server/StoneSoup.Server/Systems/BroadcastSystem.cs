using Arch.Core;
using StoneSoup.Server.Components;
using StoneSoup.Server.Net;
using StoneSoup.Server.Protocol;

namespace StoneSoup.Server.Systems;

public class BroadcastSystem
{
    private readonly World _world;
    private readonly SessionManager _sessionManager;

    public BroadcastSystem(World world, SessionManager sessionManager)
    {
        _world = world;
        _sessionManager = sessionManager;
    }

    public void Update(uint tick)
    {
        var entities = new List<EntityStateMsg>();

        var query = new QueryDescription().WithAll<Position, TemplateRef, PlayerIdentity>();
        _world.Query(in query, (Entity entity, ref Position pos, ref TemplateRef tmpl, ref PlayerIdentity identity) =>
        {
            entities.Add(new EntityStateMsg(entity.Id, pos.X, pos.Y, tmpl.TemplateId, identity.DisplayName));
        });

        var msg = new GameStateMsg(tick, entities.ToArray());
        var data = MessageEnvelope.Encode(MessageType.GameState, msg);
        _sessionManager.Broadcast(data);
    }
}
