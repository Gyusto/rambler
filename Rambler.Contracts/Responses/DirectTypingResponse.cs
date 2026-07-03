namespace Rambler.Contracts.Responses
{
    using System;

    [MessageKey(KEY)]
    public class DirectTypingResponse
    {
        public const string KEY = "DMTYPING";

        /// <summary>The user who is typing (the sender).</summary>
        public Guid UserId { get; set; }

        public string Nick { get; set; }

        public bool IsTyping { get; set; }
    }
}
