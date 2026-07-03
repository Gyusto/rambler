namespace Rambler.Contracts.Requests
{
    using System;

    [MessageKey(KEY)]
    public class DirectMessageRequest
    {
        public const string KEY = "DM";

        public Guid UserId { get; set; }
        public string Message { get; set; }

        /// <summary>If set, this message is a reply to that post.</summary>
        public long? ReplyToId { get; set; }

        /// <summary>Optional content type; "image" makes Message an image URL.</summary>
        public string Type { get; set; }
    }
}
