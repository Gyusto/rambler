namespace Rambler.Server.Database.Models
{
    /// <summary>
    /// Per-post moderation state for a blog post, keyed by slug.
    /// Only present once a moderator has touched the post.
    /// </summary>
    public class BlogPostState
    {
        public long Id { get; set; }

        /// <summary>The blog post this state belongs to (its slug).</summary>
        public string Slug { get; set; }

        /// <summary>When set, new comments are rejected for non-moderators.</summary>
        public bool CommentsDisabled { get; set; }

        /// <summary>When set, the post is hidden from listings.</summary>
        public bool Hidden { get; set; }
    }
}
