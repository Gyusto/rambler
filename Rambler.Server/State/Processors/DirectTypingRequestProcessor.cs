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
    /// Relays a "user is typing" signal to the recipient of a direct message.
    /// Ephemeral: nothing is persisted - it fans out to the target user's sockets.
    /// </summary>
    public class DirectTypingRequestProcessor : IRequestProcessor<DirectTypingRequest>
    {
        private readonly StateMutator mutator;
        private readonly IResponsePublisher dist;
        private readonly ILogger log;

        public DirectTypingRequestProcessor(
            StateMutator mutator,
            IResponsePublisher dist,
            ILogger<DirectTypingRequestProcessor> log)
        {
            this.mutator = mutator;
            this.dist = dist;
            this.log = log;
        }

        public async Task Process(Request<DirectTypingRequest> req)
        {
            // Resolve the sender's nick and confirm the recipient is online.
            var (nick, online) = await mutator.Enqueue((StateCache state) =>
            {
                if (!state.TryGetUser(req.UserId, out var user))
                {
                    return (null, false);
                }

                return (user.Nick, state.HasUser(req.Data.UserId));
            });

            // Sender not authenticated, or recipient isn't online to receive it.
            if (nick == null || !online)
            {
                return;
            }

            var timestampms = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeMilliseconds();

            var resp = new Response<DirectTypingResponse>()
            {
                // Subscription is the recipient's user id (they're subscribed to their own id).
                Subscription = req.Data.UserId,
                Timestamp = timestampms,
                Data = new DirectTypingResponse()
                {
                    UserId = req.UserId,
                    Nick = nick,
                    IsTyping = req.Data.IsTyping
                }
            };

            await dist.Publish(resp);
        }
    }
}
