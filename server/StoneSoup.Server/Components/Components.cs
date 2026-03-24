namespace StoneSoup.Server.Components;

public struct Position
{
    public float X;
    public float Y;
}

public struct Velocity
{
    public float Dx;
    public float Dy;
}

public struct MoveTarget
{
    public float X;
    public float Y;
}

public struct PlayerConnection
{
    public string ConnectionId;
}

public struct TemplateRef
{
    public string TemplateId;
}

public struct PlayerIdentity
{
    public string Namespace;
    public string DisplayName;
}
