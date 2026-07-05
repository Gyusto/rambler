namespace Rambler.Server.Options
{
    public class SiteOptions
    {
        public string AppUrl { get; set; }

        public string CookieDomain { get; set; }

        public string CookieIdentity { get; set; }

        // "None" | "Lax" | "Strict" | "Unspecified" - defaults to None (cross-site prod behind https).
        // For local http same-origin use "Lax", since None requires the Secure flag in modern browsers.
        public string CookieSameSite { get; set; } = "None";

        // "None" | "Always" | "SameAsRequest" - whether the auth cookie is flagged Secure.
        public string CookieSecure { get; set; } = "None";

        public bool AllowGuests { get; set; }

        public bool RequireVerification { get; set; }

        public bool EnableCaptcha { get; set; }

        // When true AND no SMTP is configured, newly registered users are auto-confirmed
        // (so accounts are immediately usable without an email verification link).
        // Intended for local/dev only - MUST stay false in production, otherwise anyone
        // can register accounts for emails they don't own.
        public bool AutoConfirmEmail { get; set; }

        // username that owns the auto-seeded default "Lobby" channel (falls back to a system user)
        public string LobbyOwner { get; set; }

        // comma/space-separated usernames granted server admin on startup
        public string AdminNicks { get; set; }

        // CORS: comma-separated allow-list (production). Empty -> use AllowAnyOrigin.
        public string CorsOrigins { get; set; }

        // CORS: when true (and no CorsOrigins set) reflect any origin - handy for local/dev.
        public bool AllowAnyOrigin { get; set; }
    }
}
