namespace Rambler.Contracts.Responses
{
    using System;

    using Api;
    using System.Collections.Generic;

    [MessageKey(KEY)]
    public class ChannelMessageResponse
    {
        public const string KEY = "CHMSG";

        public Guid UserId { get; set; }

        public string Type { get; set; }

        public string Nick { get; set; }

        public string Message { get; set; }

        /// <summary>If this is a reply, the post it replies to plus a short preview.</summary>
        public long? ReplyToId { get; set; }
        public string ReplyToNick { get; set; }
        public string ReplyToText { get; set; }

        /// <summary>Reactions on this post (populated in history responses).</summary>
        public List<ReactionDto> Reactions { get; set; }
    }
}
