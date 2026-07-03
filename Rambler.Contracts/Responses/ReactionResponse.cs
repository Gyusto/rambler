namespace Rambler.Contracts.Responses
{
    using System;

    [MessageKey(KEY)]
    public class ReactionResponse
    {
        public const string KEY = "REACT";

        public long PostId { get; set; }

        public string Emoji { get; set; }

        public Guid UserId { get; set; }

        public string Nick { get; set; }

        /// <summary>True if the reaction was added, false if it was removed.</summary>
        public bool Added { get; set; }
    }
}
