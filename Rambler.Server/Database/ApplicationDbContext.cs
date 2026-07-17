namespace Rambler.Server.Database
{
    using Contracts.Responses;
    using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
    using Microsoft.EntityFrameworkCore;
    using Models;
    using System;
    using System.Linq;
    using System.Threading.Tasks;

    public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public DbSet<ChannelPost> ChannelPosts { get; set; }

        public DbSet<Channel> Channels { get; set; }

        public DbSet<ChannelBan> ChannelBans { get; set; }

        public DbSet<ChannelBanAddress> ChannelBanAddresses { get; set; }

        public DbSet<ChannelModerator> ChannelModerators { get; set; }

        public DbSet<ServerBan> ServerBans { get; set; }

        public DbSet<UserChannel> UserChannels { get; set; }

        public DbSet<UserIgnore> UserIgnores { get; set; }

        public DbSet<UserConnection> UserConnections { get; set; }

        public DbSet<Bot> Bots { get; set; }

        public DbSet<BotChannel> BotChannels { get; set; }

        public DbSet<PostReaction> PostReactions { get; set; }

        public DbSet<BlogComment> BlogComments { get; set; }

        public DbSet<BlogPostState> BlogPostStates { get; set; }

        public DbSet<AppSetting> AppSettings { get; set; }

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Channel>()
                .HasIndex(c => c.Name)
                .IsUnique();

            builder.Entity<ChannelPost>()
                .HasIndex(c => c.CreatedOn);

            builder.Entity<ChannelPost>()
                .HasIndex(c => c.Subscription);

            builder.Entity<ChannelPost>()
                .HasIndex(c => c.Originator);

            builder.Entity<ChannelBan>()
                .HasIndex(c => c.UserId);

            builder.Entity<ChannelBan>()
                .HasIndex(c => c.Expires);

            builder.Entity<ChannelBanAddress>()
                .HasIndex(c => c.IPFilter);

            builder.Entity<ServerBan>()
                .HasIndex(c => c.Expires);

            builder.Entity<ServerBan>()
                .HasIndex(c => c.IPFilter);

            builder.Entity<ServerBan>()
                .HasIndex(c => c.BannedUserId);

            builder.Entity<UserConnection>()
                .HasIndex(c => c.ConnectedOn);

            builder.Entity<UserConnection>()
                .HasIndex(c => c.IPAddress);

            builder.Entity<UserIgnore>()
                .HasIndex(c => c.IgnoreId);

            builder.Entity<UserIgnore>()
                .HasIndex(c => c.IsGuestIgnore);

            builder.Entity<Bot>()
                .HasIndex(b => b.Name)
                .IsUnique();

            builder.Entity<BlogComment>()
                .HasIndex(c => c.PostSlug);

            builder.Entity<BlogPostState>()
                .HasIndex(c => c.Slug)
                .IsUnique();

            builder.Entity<AppSetting>()
                .HasIndex(c => c.Key)
                .IsUnique();

            // Customize the ASP.NET Identity model and override the defaults if needed.
            // For example, you can rename the ASP.NET Identity table names and more.
            // Add your customizations after calling base.OnModelCreating(builder);
        }

        public async Task<long> SavePost(
            Guid subscription,
            Guid originator,
            DateTime timestamp,
            string message,
            string nick,
            string type,
            long? replyToId = null)
        {
            var sresp = new ChannelPost()
            {
                CreatedOn = timestamp,
                Originator = originator,
                Nick = nick,
                Subscription = subscription,
                Message = message,
                Type = type,
                ReplyToId = replyToId,
            };

            ChannelPosts.Add(sresp);
            await SaveChangesAsync();

            return sresp.Id;
        }

        /// <summary>Result of a reaction toggle - tells the caller where to fan out.</summary>
        public class ReactionToggle
        {
            public bool Added { get; set; }
            public Guid Subscription { get; set; }
            public Guid Originator { get; set; }
        }

        /// <summary>Add the reaction if the caller hasn't placed it, otherwise remove it.</summary>
        public async Task<ReactionToggle> ToggleReaction(long postId, Guid userId, string nick, string emoji)
        {
            var post = await ChannelPosts
                .Where(p => p.Id == postId)
                .Select(p => new { p.Subscription, p.Originator })
                .FirstOrDefaultAsync();

            if (post == null)
            {
                return null;
            }

            var existing = await PostReactions
                .FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId && r.Emoji == emoji);

            bool added;
            if (existing != null)
            {
                PostReactions.Remove(existing);
                added = false;
            }
            else
            {
                PostReactions.Add(new PostReaction
                {
                    PostId = postId,
                    UserId = userId,
                    Nick = nick,
                    Emoji = emoji,
                    CreatedOn = DateTime.UtcNow,
                });
                added = true;
            }

            await SaveChangesAsync();

            return new ReactionToggle
            {
                Added = added,
                Subscription = post.Subscription,
                Originator = post.Originator,
            };
        }

        /// <summary>All reactions for a set of posts (for history hydration).</summary>
        public Task<System.Collections.Generic.List<PostReaction>> GetReactionsForPosts(
            System.Collections.Generic.IEnumerable<long> postIds)
        {
            return PostReactions
                .Where(r => postIds.Contains(r.PostId))
                .ToListAsync();
        }
    }
}
