namespace Rambler.Server
{
    using Database;
    using Database.Models;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Options;
    using System;
    using System.Linq;
    using System.Threading.Tasks;

    /// <summary>
    /// Seeds a default public "Lobby" channel so a fresh install has a room to land in.
    /// The client auto-joins "Lobby" when no other room is specified.
    /// </summary>
    public class InitializeChannels
    {
        public const string LobbyName = "Lobby";
        public const string SystemUserName = "system";

        private readonly ApplicationDbContext db;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly SiteOptions site;
        private readonly ILogger<InitializeChannels> log;

        public InitializeChannels(ApplicationDbContext db, UserManager<ApplicationUser> userManager, IOptions<SiteOptions> site, ILogger<InitializeChannels> log)
        {
            this.db = db;
            this.userManager = userManager;
            this.site = site.Value;
            this.log = log;
        }

        /// <summary>
        /// Grant server admin to the accounts named in Site:AdminNicks. Runs on every
        /// startup and is idempotent; a nick that doesn't exist yet is logged and skipped.
        /// </summary>
        public async Task EnsureServerAdmins()
        {
            if (string.IsNullOrWhiteSpace(site.AdminNicks))
            {
                return;
            }

            var nicks = site.AdminNicks.Split(new[] { ',', ' ', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var nick in nicks)
            {
                var user = await userManager.FindByNameAsync(nick.Trim());
                if (user == null)
                {
                    log.LogWarning("Configured admin nick not found: {nick}", nick);
                    continue;
                }

                if (user.Level < ApplicationUser.UserLevel.Admin)
                {
                    user.Level = ApplicationUser.UserLevel.Admin;
                    await userManager.UpdateAsync(user);
                    log.LogInformation("Granted server admin to {nick}", nick);
                }
            }
        }

        public async Task SeedLobby()
        {
            var existing = await db.Channels
                .Where(c => c.Name == LobbyName)
                .SingleOrDefaultAsync();

            if (existing != null)
            {
                return;
            }

            // channels require an owner (FK). Prefer the configured account if present so it gets
            // room-owner powers; otherwise fall back to a non-login system account.
            ApplicationUser owner = null;
            if (!string.IsNullOrWhiteSpace(site.LobbyOwner))
            {
                owner = await userManager.FindByNameAsync(site.LobbyOwner);
            }
            owner ??= await userManager.FindByNameAsync(SystemUserName);
            if (owner == null)
            {
                owner = new ApplicationUser()
                {
                    UserName = SystemUserName,
                    Email = "system@localhost",
                    EmailConfirmed = true,
                    Level = ApplicationUser.UserLevel.Admin,
                    RegistrationDate = DateTime.UtcNow,
                    LastSeenDate = DateTime.UtcNow,
                };

                var result = await userManager.CreateAsync(owner);
                if (!result.Succeeded)
                {
                    log.LogError("Failed to create system user for the Lobby: {errors}",
                        string.Join("; ", result.Errors.Select(e => e.Description)));
                    return;
                }
            }

            var now = DateTime.UtcNow;
            db.Channels.Add(new Channel()
            {
                Created = now,
                LastModified = now,
                LastActivity = now,
                Owner = owner,
                Name = LobbyName,
                Description = "Welcome to the Lobby!",
                AllowGuests = true,
                AllowMedia = true,
                AllowLinks = true,
                IsSecret = false,
                MaxUsers = 100,
            });

            await db.SaveChangesAsync();
            log.LogInformation("Seeded default '{lobby}' channel.", LobbyName);
        }
    }
}
