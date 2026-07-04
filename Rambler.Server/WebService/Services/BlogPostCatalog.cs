namespace Rambler.Server.WebService.Services
{
    using Microsoft.Extensions.Configuration;
    using System;
    using System.Collections.Generic;

    /// <summary>
    /// The set of known blog post slugs. Used to reject comments/moderation on
    /// posts that don't exist. Sourced from <c>Blog:PostSlugs</c> (comma/space
    /// separated) with a hardcoded default matching the shipped posts.
    /// </summary>
    public class BlogPostCatalog
    {
        private static readonly char[] Separators = { ',', ' ', '\t', '\r', '\n' };

        /// <summary>The slugs of the posts shipped with the site.</summary>
        private static readonly string[] DefaultSlugs =
        {
            "reactions-replies-and-file-sharing",
            "six-themes-and-why-black-is-default",
            "self-hosting-with-docker-and-minio",
            "how-the-websocket-protocol-works",
            "moderation-tools-for-healthy-channels",
            "guests-accounts-and-changing-your-nick",
        };

        private readonly HashSet<string> slugs;

        public BlogPostCatalog(IConfiguration configuration)
        {
            var configured = configuration?["Blog:PostSlugs"];
            var source = string.IsNullOrWhiteSpace(configured)
                ? DefaultSlugs
                : configured.Split(Separators, StringSplitOptions.RemoveEmptyEntries);

            slugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var slug in source)
            {
                var trimmed = slug.Trim();
                if (trimmed.Length > 0)
                {
                    slugs.Add(trimmed);
                }
            }
        }

        /// <summary>True when the slug is a known blog post.</summary>
        public bool IsKnown(string slug) =>
            !string.IsNullOrWhiteSpace(slug) && slugs.Contains(slug);
    }
}
