namespace Rambler.Contracts.Requests
{
    using System;

    [MessageKey(KEY)]
    public class ChannelTypingRequest
    {
        public const string KEY = "CHTYPING";

        public Guid ChannelId { get; set; }

        public bool IsTyping { get; set; }
    }
}
