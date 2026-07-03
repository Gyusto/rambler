namespace Rambler.Server.State.Processors
{
    using Contracts.Api;
    using Contracts.Requests;
    using Contracts.Responses;
    using Contracts.Server;
    using Microsoft.Extensions.Logging;
    using State;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;

    /// <summary>
    /// Live nickname change: updates the user in the state cache and pushes a
    /// roster update (CHUSERUPDATE) to every channel they're in. The client
    /// turns the nick change into a "X changed their name to Y" line.
    /// </summary>
    public class RenameRequestProcessor : IRequestProcessor<RenameRequest>
    {
        private readonly StateMutator mutator;
        private readonly IResponsePublisher dist;
        private readonly ILogger log;

        public RenameRequestProcessor(
            StateMutator mutator,
            IResponsePublisher dist,
            ILogger<RenameRequestProcessor> log)
        {
            this.mutator = mutator;
            this.dist = dist;
            this.log = log;
        }

        public async Task Process(Request<RenameRequest> req)
        {
            var result = await mutator.Enqueue((StateCache state) =>
            {
                if (!state.TryGetUser(req.UserId, out var user))
                {
                    return null;
                }

                var nick = req.Data.Nick?.Trim();
                if (string.IsNullOrWhiteSpace(nick))
                {
                    return null;
                }

                // reject a name already held by someone else
                if (state.TryGetUser(nick, out var other) && other.Id != req.UserId)
                {
                    return new Renamed { Taken = true };
                }

                state.AddOrUpdateUser(new StateCache.User(user.Id, nick, user.IsGuest, user.Level, true));

                return new Renamed
                {
                    NewNick = nick,
                    IsGuest = user.IsGuest,
                    Level = user.Level,
                    Channels = state.GetUserChannels(req.UserId).ToList(),
                };
            });

            if (result == null)
            {
                return; // not authenticated / empty nick
            }

            if (result.Taken)
            {
                await dist.PublishError(req.SocketId, ErrorResponse.ErrorCode.NickInUse);
                return;
            }

            foreach (var chId in result.Channels)
            {
                await dist.Publish(new Response<ChannelUserUpdateResponse>()
                {
                    Subscription = chId,
                    Data = new ChannelUserUpdateResponse()
                    {
                        UserId = req.UserId,
                        Nick = result.NewNick,
                        IsGuest = result.IsGuest,
                        Level = (ModerationLevel)result.Level,
                    }
                });
            }
        }

        private class Renamed
        {
            public bool Taken { get; set; }
            public string NewNick { get; set; }
            public bool IsGuest { get; set; }
            public int Level { get; set; }
            public List<Guid> Channels { get; set; }
        }
    }
}
