namespace Rambler.Contracts.Responses
{
    using System;

    using Api;
    using System.Collections.Generic;

    [MessageKey(KEY)]
    public class DirectMessageResponse
    {
        public const string KEY = "DM";

        public Guid UserId { get; set; }

        public string Type { get; set; }

        public string Message { get; set; }

        public Guid? EchoUser { get; set; }

        public string Nick { get; set; }

        public long? ReplyToId { get; set; }
        public string ReplyToNick { get; set; }
        public string ReplyToText { get; set; }

        public List<ReactionDto> Reactions { get; set; }
    }
}
