namespace Rambler.Contracts.Requests
{
    [MessageKey(KEY)]
    public class ReactionRequest
    {
        public const string KEY = "REACT";

        /// <summary>The post being reacted to (ChannelPost.Id).</summary>
        public long PostId { get; set; }

        /// <summary>The emoji; toggles on/off for the caller.</summary>
        public string Emoji { get; set; }
    }
}
