namespace Rambler.Server.WebService.Controllers
{
    using System.Linq;
    using System.Threading.Tasks;
    using System;
    using Contracts.Api;
    using Database.Models;
    using Database;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.Logging;

    [Authorize]
    public class ImportController : ControllerBase
    {
        readonly ILogger logger;
        readonly ApplicationDbContext db;
        readonly UserManager<ApplicationUser> userManager;

        public ImportController(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext db,
            ILogger<ImportController> logger)
        {
            this.userManager = userManager;
            this.logger = logger;
            this.db = db;
        }

        /// <summary>The caller if they're a server admin, otherwise null.</summary>
        private async Task<ApplicationUser> GetAdmin()
        {
            var user = await userManager.GetUserAsync(User);
            return user != null && user.Level >= ApplicationUser.UserLevel.Admin ? user : null;
        }

        /// <summary>Parse an Anope date, falling back to now on anything malformed.</summary>
        private static DateTime SafeDate(string value)
        {
            return DateTime.TryParse(value, out var parsed) ? parsed : DateTime.UtcNow;
        }

        [HttpPost]
        public async Task<IActionResult> Anope([FromBody] AnopeImport registrations)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            if (registrations == null)
            {
                return BadRequest("No import payload.");
            }

            // The full import wipes everything and rebuilds it, so run it in a
            // transaction: a bad record rolls the whole thing back instead of
            // leaving a half-empty database.
            using (var tx = db.Database.BeginTransaction())
            {
                try
                {
                    db.UserConnections.RemoveRange(db.UserConnections);
                    db.ChannelModerators.RemoveRange(db.ChannelModerators);
                    db.ChannelBanAddresses.RemoveRange(db.ChannelBanAddresses);
                    db.ChannelBans.RemoveRange(db.ChannelBans);
                    db.Channels.RemoveRange(db.Channels);
                    db.UserRoles.RemoveRange(db.UserRoles);
                    db.Users.RemoveRange(db.Users);
                    await db.SaveChangesAsync();

                    await ImportUsers(registrations.Nicknames);
                    await ImportChannels(registrations.Channels);
                    await ImportModerators(registrations.Moderators);

                    tx.Commit();
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    logger.LogError(ex, "Anope import failed; rolled back.");
                    return StatusCode(500, "Import failed and was rolled back.");
                }
            }

            return Ok();
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeUser([FromBody] AnopeNicknameRegistration[] registrations)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            await ImportUsers(registrations);
            return Ok();
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeChannel([FromBody] AnopeChannelRegistration[] registrations)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            await ImportChannels(registrations);
            return Ok();
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeChannelModerators([FromBody] AnopeChannelModerator[] moderators)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            await ImportModerators(moderators);
            return Ok();
        }

        private async Task ImportUsers(AnopeNicknameRegistration[] registrations)
        {
            if (registrations == null)
            {
                return;
            }

            string[] admins = new string[] { "j", "k", "dv", "lyn" };

            foreach (AnopeNicknameRegistration registration in registrations)
            {
                var user = new ApplicationUser()
                {
                    UserName = registration.nick,
                    Email = registration.email,
                    RegistrationDate = SafeDate(registration.register_date),
                    LastSeenDate = SafeDate(registration.last_connection_date),
                    EmailConfirmed = true
                };

                if (admins.Contains(registration.nick.ToLower()))
                {
                    user.Level = ApplicationUser.UserLevel.Admin;
                }

                await userManager.CreateAsync(user, registration.password);
            }
        }

        private async Task ImportChannels(AnopeChannelRegistration[] registrations)
        {
            if (registrations == null)
            {
                return;
            }

            foreach (AnopeChannelRegistration registration in registrations)
            {
                if (registration.forbidden)
                {
                    continue;
                }

                var user = await userManager.FindByNameAsync(registration.founder)
                    ?? await userManager.FindByNameAsync(registration.successor);

                if (user != null)
                {
                    var channel = new Channel()
                    {
                        Created = SafeDate(registration.time_registered),
                        LastModified = DateTime.UtcNow,
                        LastActivity = SafeDate(registration.last_used),
                        Owner = user,
                        Name = registration.name,
                        Description = registration.last_topic,
                        IsSecret = false,
                        AllowGuests = false,
                        MaxUsers = 250,
                    };

                    await db.Channels.AddAsync(channel);
                    await db.SaveChangesAsync();
                }
            }
        }

        private async Task ImportModerators(AnopeChannelModerator[] moderators)
        {
            if (moderators == null)
            {
                return;
            }

            foreach (AnopeChannelModerator moderator in moderators)
            {
                var user = await userManager.FindByNameAsync(moderator.nick);
                var channel = await db.Channels.FirstOrDefaultAsync(ch => ch.Name == moderator.channel);

                if (user != null && channel != null)
                {
                    var mod_level = moderator.level == ChannelModeratorLevels.sop
                        ? ModerationLevel.Admin
                        : ModerationLevel.Moderator;

                    var mod = new ChannelModerator()
                    {
                        Channel = channel,
                        Created = DateTime.UtcNow,
                        Level = mod_level,
                        User = user
                    };

                    await db.ChannelModerators.AddAsync(mod);
                    await db.SaveChangesAsync();
                }
            }
        }
    }
}
