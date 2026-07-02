namespace Rambler.Contracts.Responses
{
    using System;

    [MessageKey(KEY)]
    public class ChannelTypingResponse
    {
        public const string KEY = "CHTYPING";

        public Guid UserId { get; set; }

        public string Nick { get; set; }

        public bool IsTyping { get; set; }
    }
}
