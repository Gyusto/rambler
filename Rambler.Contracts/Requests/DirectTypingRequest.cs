namespace Rambler.Contracts.Requests
{
    using System;

    [MessageKey(KEY)]
    public class DirectTypingRequest
    {
        public const string KEY = "DMTYPING";

        /// <summary>The user the typing signal is directed at.</summary>
        public Guid UserId { get; set; }

        public bool IsTyping { get; set; }
    }
}
