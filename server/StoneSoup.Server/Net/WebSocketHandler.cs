using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace StoneSoup.Server.Net;

public static class WebSocketHandler
{
    public static async Task ReceiveLoop(
        WebSocket webSocket,
        string connectionId,
        ConcurrentQueue<(string ConnectionId, byte[] Data, int Length)> inputQueue,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[4096];

        while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                if (result.MessageType == WebSocketMessageType.Binary && result.Count > 0)
                {
                    // Copy the data since the buffer will be reused
                    var data = new byte[result.Count];
                    Buffer.BlockCopy(buffer, 0, data, 0, result.Count);
                    inputQueue.Enqueue((connectionId, data, result.Count));
                }
            }
            catch (WebSocketException)
            {
                break;
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
