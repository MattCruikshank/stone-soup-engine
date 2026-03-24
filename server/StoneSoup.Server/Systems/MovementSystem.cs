using Arch.Core;
using StoneSoup.Server.Components;

namespace StoneSoup.Server.Systems;

public class MovementSystem
{
    private const float MoveSpeed = 200f; // pixels per second
    private const float ArrivalThreshold = 2f;

    private readonly World _world;

    public MovementSystem(World world)
    {
        _world = world;
    }

    public void Update(float deltaTime)
    {
        var entitiesToRemoveTarget = new List<Entity>();

        var query = new QueryDescription().WithAll<Position, Velocity, MoveTarget>();
        _world.Query(in query, (Entity entity, ref Position pos, ref Velocity vel, ref MoveTarget target) =>
        {
            var dx = target.X - pos.X;
            var dy = target.Y - pos.Y;
            var dist = MathF.Sqrt(dx * dx + dy * dy);

            if (dist < ArrivalThreshold)
            {
                vel.Dx = 0;
                vel.Dy = 0;
                pos.X = target.X;
                pos.Y = target.Y;
                entitiesToRemoveTarget.Add(entity);
                return;
            }

            // Normalize and apply speed
            var nx = dx / dist;
            var ny = dy / dist;
            vel.Dx = nx * MoveSpeed;
            vel.Dy = ny * MoveSpeed;

            pos.X += vel.Dx * deltaTime;
            pos.Y += vel.Dy * deltaTime;
        });

        // Remove MoveTarget from arrived entities (can't modify archetype during query)
        foreach (var entity in entitiesToRemoveTarget)
        {
            _world.Remove<MoveTarget>(entity);
        }
    }
}
