namespace Rambler.Server.State.Processors
{
    using Contracts.Requests;
    using Contracts.Responses;
    using Contracts.Server;
    using Database;
    using Microsoft.Extensions.Logging;
    using State;
    using System;
    using System.Threading.Tasks;

    /// <summary>
    /// Toggles an emoji reaction on a post and fans the change out to everyone
    /// who can see it (the post's channel, and for DMs both participants).
    /// </summary>
    public class ReactionRequestProcessor : IRequestProcessor<ReactionRequest>
    {
        private readonly StateMutator mutator;
        private readonly IResponsePublisher dist;
        private readonly ApplicationDbContext db;
        private readonly ILogger log;

        public ReactionRequestProcessor(
            StateMutator mutator,
            IResponsePublisher dist,
            ApplicationDbContext db,
            ILogger<ReactionRequestProcessor> log)
        {
            this.mutator = mutator;
            this.dist = dist;
            this.db = db;
            this.log = log;
        }

        public async Task Process(Request<ReactionRequest> req)
        {
            var nick = await mutator.Enqueue((StateCache state) =>
                state.TryGetUser(req.UserId, out var u) ? u.Nick : null);

            if (nick == null || string.IsNullOrEmpty(req.Data.Emoji))
            {
                return;
            }

            var result = await db.ToggleReaction(req.Data.PostId, req.UserId, nick, req.Data.Emoji);
            if (result == null)
            {
                return; // post not found
            }

            var ms = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeMilliseconds();

            await Publish(result.Subscription, ms, req, nick, result.Added);

            // DM posts are keyed by the recipient; also reach the other participant.
            if (result.Originator != result.Subscription)
            {
                await Publish(result.Originator, ms, req, nick, result.Added);
            }
        }

        private Task Publish(Guid subscription, long ms, Request<ReactionRequest> req, string nick, bool added)
        {
            return dist.Publish(new Response<ReactionResponse>()
            {
                Subscription = subscription,
                Timestamp = ms,
                Data = new ReactionResponse()
                {
                    PostId = req.Data.PostId,
                    Emoji = req.Data.Emoji,
                    UserId = req.UserId,
                    Nick = nick,
                    Added = added,
                }
            });
        }
    }
}
