namespace Rambler.Contracts.Api
{
    using System;

    /// <summary>A single emoji reaction on a post.</summary>
    public class ReactionDto
    {
        public string Emoji { get; set; }

        public Guid UserId { get; set; }

        public string Nick { get; set; }
    }
}
