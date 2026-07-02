namespace Rambler.Server.Options
{
    public class SiteOptions
    {
        public string AppUrl { get; set; }

        public string CookieDomain { get; set; }

        public string CookieIdentity { get; set; }

        // "None" | "Lax" | "Strict" | "Unspecified" — defaults to None (cross-site prod behind https).
        // For local http same-origin use "Lax", since None requires the Secure flag in modern browsers.
        public string CookieSameSite { get; set; } = "None";

        // "None" | "Always" | "SameAsRequest" — whether the auth cookie is flagged Secure.
        public string CookieSecure { get; set; } = "None";

        public bool AllowGuests { get; set; }

        public bool RequireVerification { get; set; }

        public bool EnableCaptcha { get; set; }

        // username that owns the auto-seeded default "Lobby" channel (falls back to a system user)
        public string LobbyOwner { get; set; }
    }
}
