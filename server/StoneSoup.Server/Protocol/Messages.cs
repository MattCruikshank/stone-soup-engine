using MessagePack;

namespace StoneSoup.Server.Protocol;

public static class MessageType
{
    // Client -> Server
    public const byte MoveToTarget = 0x01;

    // Server -> Client
    public const byte Welcome = 0x81;
    public const byte GameState = 0x82;
    public const byte PlayerJoined = 0x83;
    public const byte PlayerLeft = 0x84;
}

[MessagePackObject]
public record struct MoveToTargetMsg([property: Key(0)] float X, [property: Key(1)] float Y);

[MessagePackObject]
public record struct WelcomeMsg([property: Key(0)] int PlayerId);

[MessagePackObject]
public record struct EntityStateMsg(
    [property: Key(0)] int EntityId,
    [property: Key(1)] float X,
    [property: Key(2)] float Y,
    [property: Key(3)] string TemplateId);

[MessagePackObject]
public record struct GameStateMsg(
    [property: Key(0)] uint Tick,
    [property: Key(1)] EntityStateMsg[] Entities);

[MessagePackObject]
public record struct PlayerJoinedMsg([property: Key(0)] int EntityId);

[MessagePackObject]
public record struct PlayerLeftMsg([property: Key(0)] int EntityId);

public static class MessageEnvelope
{
    public static byte[] Encode<T>(byte type, T payload)
    {
        var body = MessagePackSerializer.Serialize(payload);
        var msg = new byte[1 + body.Length];
        msg[0] = type;
        Buffer.BlockCopy(body, 0, msg, 1, body.Length);
        return msg;
    }

    public static (byte type, ReadOnlyMemory<byte> payload) Decode(byte[] data, int length)
    {
        return (data[0], new ReadOnlyMemory<byte>(data, 1, length - 1));
    }

    public static T DeserializePayload<T>(ReadOnlyMemory<byte> payload)
    {
        return MessagePackSerializer.Deserialize<T>(payload);
    }
}
