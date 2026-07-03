namespace Rambler.Server.Database.Models
{
    using System;

    /// <summary>
    /// A comment a registered user left on a blog post.
    /// Top-level when ParentId is null, otherwise a one-level reply.
    /// </summary>
    public class BlogComment
    {
        public long Id { get; set; }

        /// <summary>The blog post being commented on (its slug).</summary>
        public string PostSlug { get; set; }

        /// <summary>The comment being replied to, or null for a top-level comment.</summary>
        public long? ParentId { get; set; }

        public Guid UserId { get; set; }

        /// <summary>Denormalized nick so history can show who commented.</summary>
        public string Nick { get; set; }

        public string Body { get; set; }

        public DateTime CreatedOn { get; set; }
    }
}
