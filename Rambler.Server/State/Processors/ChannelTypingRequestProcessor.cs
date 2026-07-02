namespace Rambler.Server.State.Processors
{
    using Contracts.Requests;
    using Contracts.Responses;
    using Contracts.Server;
    using Microsoft.Extensions.Logging;
    using State;
    using System;
    using System.Threading.Tasks;

    /// <summary>
    /// Relays a "user is typing" signal to everyone subscribed to the channel.
    /// Ephemeral: nothing is persisted - it just fans out to the roster.
    /// </summary>
    public class ChannelTypingRequestProcessor : IRequestProcessor<ChannelTypingRequest>
    {
        private readonly StateMutator mutator;
        private readonly IResponsePublisher dist;
        private readonly ILogger log;

        public ChannelTypingRequestProcessor(
            StateMutator mutator,
            IResponsePublisher dist,
            ILogger<ChannelTypingRequestProcessor> log)
        {
            this.mutator = mutator;
            this.dist = dist;
            this.log = log;
        }

        public async Task Process(Request<ChannelTypingRequest> req)
        {
            // Only relay for authenticated users who are actually in the channel.
            var user = await mutator.Enqueue((StateCache state) =>
            {
                if (!state.TryGetUser(req.UserId, out var u))
                {
                    return (StateCache.User)null;
                }

                if (!state.TryGetChannelUserInfo(req.Data.ChannelId, req.UserId, out var info))
                {
                    return (StateCache.User)null;
                }

                return u;
            });

            if (user == null)
            {
                return; // silently drop - typing pings are best-effort
            }

            var timestampms = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeMilliseconds();

            var resp = new Response<ChannelTypingResponse>()
            {
                Subscription = req.Data.ChannelId,
                Timestamp = timestampms,
                Data = new ChannelTypingResponse()
                {
                    UserId = req.UserId,
                    Nick = user.Nick,
                    IsTyping = req.Data.IsTyping
                }
            };

            await dist.Publish(resp);
        }
    }
}
