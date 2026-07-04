namespace Rambler.Server.WebService.Services
{
    using System;
    using System.Collections.Concurrent;
    using System.Threading.Channels;

    /// <summary>
    /// Fan-out hub for live blog comment updates. Each viewer subscribes to a
    /// post's slug and receives every JSON event published for that post, so the
    /// SSE endpoint can push new/edited/deleted comments without polling.
    /// </summary>
    public class BlogCommentBroadcaster
    {
        /// <summary>Bounded so a slow/dead reader can never grow memory without limit.</summary>
        private const int SubscriberBufferSize = 64;

        private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<string>>> subscribers =
            new ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<string>>>();

        /// <summary>
        /// Register a new subscriber for the given slug, returning its id (for
        /// <see cref="Unsubscribe"/>) and the reader to pump events from.
        /// </summary>
        public (Guid Id, ChannelReader<string> Reader) Subscribe(string slug)
        {
            var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(SubscriberBufferSize)
            {
                // Never block the publisher; a backed-up viewer just loses the oldest events.
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false,
            });

            var id = Guid.NewGuid();
            var forSlug = subscribers.GetOrAdd(slug, _ => new ConcurrentDictionary<Guid, Channel<string>>());
            forSlug[id] = channel;
            return (id, channel.Reader);
        }

        /// <summary>Drop a subscriber and complete its channel so its reader loop ends.</summary>
        public void Unsubscribe(string slug, Guid id)
        {
            if (subscribers.TryGetValue(slug, out var forSlug))
            {
                if (forSlug.TryRemove(id, out var channel))
                {
                    channel.Writer.TryComplete();
                }

                if (forSlug.IsEmpty)
                {
                    subscribers.TryRemove(slug, out _);
                }
            }
        }

        /// <summary>Write a JSON event to every subscriber of a slug; full/closed channels are skipped.</summary>
        public void Publish(string slug, string json)
        {
            if (subscribers.TryGetValue(slug, out var forSlug))
            {
                foreach (var channel in forSlug.Values)
                {
                    channel.Writer.TryWrite(json);
                }
            }
        }
    }
}
