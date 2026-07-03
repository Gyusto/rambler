namespace Rambler.Contracts.Requests
{
    [MessageKey(KEY)]
    public class RenameRequest
    {
        public const string KEY = "RENAME";

        public string Nick { get; set; }
    }
}
