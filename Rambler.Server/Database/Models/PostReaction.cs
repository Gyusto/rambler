namespace Rambler.Server.Database.Models
{
    using System;

    /// <summary>
    /// An emoji reaction a user placed on a channel/DM post.
    /// Unique per (post, user, emoji).
    /// </summary>
    public class PostReaction
    {
        public long Id { get; set; }

        /// <summary>The post being reacted to (ChannelPost.Id).</summary>
        public long PostId { get; set; }

        public Guid UserId { get; set; }

        /// <summary>Denormalized nick so history can show who reacted.</summary>
        public string Nick { get; set; }

        public string Emoji { get; set; }

        public DateTime CreatedOn { get; set; }
    }
}
