namespace Rambler.Server.Database.Models
{
    /// <summary>
    /// A single key/value application setting, persisted so admin-configurable
    /// options (like the notification sound) survive a restart.
    /// </summary>
    public class AppSetting
    {
        public long Id { get; set; }

        /// <summary>The unique lookup key for this setting.</summary>
        public string Key { get; set; }

        /// <summary>The stored value for this setting.</summary>
        public string Value { get; set; }
    }
}
