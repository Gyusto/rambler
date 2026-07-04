namespace Rambler.Server.State.Processors
{
    using Contracts.Api;
    using Contracts.Requests;
    using Contracts.Responses;
    using Contracts.Server;
    using Database;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.Logging;
    using State;
    using System;
    using System.Linq;
    using System.Text.RegularExpressions;
    using System.Threading.Tasks;

    public class ChannelMessageRequestProcessor : IRequestProcessor<ChannelMessageRequest>
    {
        // Matches an explicit scheme (http/https), a www. prefix, or a bare domain.tld token.
        private static readonly Regex LinkPattern = new Regex(
            @"(https?://|www\.|[a-z0-9-]+\.[a-z]{2,})",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private readonly StateMutator mutator;
        private readonly IResponsePublisher dist;
        private readonly ILogger log;
        private readonly ApplicationDbContext db;

        public ChannelMessageRequestProcessor(
            StateMutator mutator,
            IResponsePublisher dist,
            ILogger<ChannelMessageRequestProcessor> log,
            ApplicationDbContext db)
        {
            this.mutator = mutator;
            this.dist = dist;
            this.log = log;
            this.db = db;
        }

        public async Task Process(Request<ChannelMessageRequest> req)
        {
            // likely makes sense to not block for sending the messages
            // only queue the 'can send' check
            // should work similar to dm's
            var user = await mutator.Enqueue(async (state) =>
            {
                if (!state.TryGetUser(req.UserId, out var u))
                {
                    await dist.PublishError(req.SocketId, ErrorResponse.ErrorCode.NotAuthenticated);
                    return null;
                }

                if (!state.TryGetChannelUserInfo(req.Data.ChannelId, req.UserId, out var info))
                {
                    await dist.PublishError(req.SocketId, ErrorResponse.ErrorCode.NotInChannel);
                    return null;
                }

                // if info says you're muted, then stay quiet.

                // owner controls: reject media / links when the room has them turned off
                if (state.TryGetChannel(req.Data.ChannelId, out var channel))
                {
                    var isMedia = req.Data.Type == MessageTypes.IMAGE || req.Data.Type == MessageTypes.FILE;
                    if (isMedia && !channel.AllowsMedia)
                    {
                        await dist.PublishError(req.SocketId, ErrorResponse.ErrorCode.MediaNotAllowed);
                        return null;
                    }

                    if (!isMedia && !channel.AllowsLinks && ContainsLink(req.Data.Message))
                    {
                        await dist.PublishError(req.SocketId, ErrorResponse.ErrorCode.LinkNotAllowed);
                        return null;
                    }
                }

                return u;
            });

            if (user == null)
            {
                return; // errored
            }

            var timestamp = DateTime.UtcNow;
            var timestampms = ((DateTimeOffset)timestamp).ToUnixTimeMilliseconds();

            // If replying, grab a short preview of the post being replied to.
            string replyNick = null, replyText = null;
            if (req.Data.ReplyToId.HasValue)
            {
                var rp = await db.ChannelPosts
                    .Where(p => p.Id == req.Data.ReplyToId.Value)
                    .Select(p => new { p.Nick, p.Message })
                    .FirstOrDefaultAsync();
                if (rp != null)
                {
                    replyNick = rp.Nick;
                    replyText = rp.Message;
                }
            }

            // Only media types are honoured as a client-set type; everything else is a plain message.
            var type = req.Data.Type == MessageTypes.IMAGE || req.Data.Type == MessageTypes.FILE
                ? req.Data.Type
                : MessageTypes.MESSAGE;

            var resp = new Response<ChannelMessageResponse>()
            {
                Subscription = req.Data.ChannelId,
                Timestamp = timestampms,
                Data = new ChannelMessageResponse()
                {
                    UserId = req.UserId,
                    Message = req.Data.Message,
                    Type = type,
                    ReplyToId = req.Data.ReplyToId,
                    ReplyToNick = replyNick,
                    ReplyToText = replyText,
                }
            };

            var id = await db.SavePost(
                resp.Subscription,
                resp.Data.UserId,
                timestamp,
                resp.Data.Message,
                user.Nick,
                resp.Data.Type,
                req.Data.ReplyToId
                );

            resp.Id = id;

            await dist.Publish(resp);


        }

        private static bool ContainsLink(string message)
        {
            return !string.IsNullOrWhiteSpace(message) && LinkPattern.IsMatch(message);
        }
    }
}
