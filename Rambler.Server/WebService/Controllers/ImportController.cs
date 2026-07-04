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
            ImportSummary summary;
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

                    summary = new ImportSummary
                    {
                        Users = await ImportUsers(registrations.Nicknames),
                        Channels = await ImportChannels(registrations.Channels),
                        Moderators = await ImportModerators(registrations.Moderators),
                    };

                    tx.Commit();
                }
                catch (Exception ex)
                {
                    tx.Rollback();
                    logger.LogError(ex, "Anope import failed; rolled back.");
                    return StatusCode(500, "Import failed and was rolled back.");
                }
            }

            return Ok(summary);
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeUser([FromBody] AnopeNicknameRegistration[] registrations)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            return Ok(await ImportUsers(registrations));
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeChannel([FromBody] AnopeChannelRegistration[] registrations)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            return Ok(await ImportChannels(registrations));
        }

        [HttpPost]
        public async Task<IActionResult> RegisterAnopeChannelModerators([FromBody] AnopeChannelModerator[] moderators)
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            return Ok(await ImportModerators(moderators));
        }

        /// <summary>
        /// Export the current users, channels and moderators in the same shape
        /// the import accepts, so the data can be backed up or round-tripped.
        /// Passwords are hashed and cannot be exported as plaintext.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Export()
        {
            if (await GetAdmin() == null)
            {
                return Unauthorized();
            }

            var users = await db.Users.ToListAsync();
            var channels = await db.Channels.Include(c => c.Owner).ToListAsync();
            var moderators = await db.ChannelModerators
                .Include(m => m.User)
                .Include(m => m.Channel)
                .ToListAsync();

            var export = new AnopeImport
            {
                Nicknames = users.Select(u => new AnopeNicknameRegistration
                {
                    nick = u.UserName,
                    email = u.Email,
                    register_date = u.RegistrationDate.ToString("o"),
                    last_connection_date = u.LastSeenDate.ToString("o"),
                    password = "",
                }).ToArray(),
                Channels = channels.Select(c => new AnopeChannelRegistration
                {
                    name = c.Name,
                    founder = c.Owner?.UserName,
                    successor = "",
                    time_registered = c.Created.ToString("o"),
                    last_used = c.LastActivity.ToString("o"),
                    last_topic = c.Description,
                    forbidden = false,
                    forbidreason = "",
                }).ToArray(),
                Moderators = moderators.Select(m => new AnopeChannelModerator
                {
                    nick = m.User?.UserName,
                    channel = m.Channel?.Name,
                    level = m.Level >= ModerationLevel.Admin
                        ? ChannelModeratorLevels.sop
                        : ChannelModeratorLevels.aop,
                    last_seen = "",
                }).ToArray(),
            };

            return Ok(export);
        }

        private async Task<ImportResult> ImportUsers(AnopeNicknameRegistration[] registrations)
        {
            var result = new ImportResult();
            if (registrations == null)
            {
                return result;
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

                if (!string.IsNullOrEmpty(registration.nick) && admins.Contains(registration.nick.ToLower()))
                {
                    user.Level = ApplicationUser.UserLevel.Admin;
                }

                // Don't swallow failures: a duplicate nick or a password the
                // identity rules reject is counted as skipped, not silently lost.
                var created = await userManager.CreateAsync(user, registration.password);
                if (created.Succeeded)
                {
                    result.Created++;
                }
                else
                {
                    result.Skipped++;
                }
            }

            return result;
        }

        private async Task<ImportResult> ImportChannels(AnopeChannelRegistration[] registrations)
        {
            var result = new ImportResult();
            if (registrations == null)
            {
                return result;
            }

            foreach (AnopeChannelRegistration registration in registrations)
            {
                if (registration.forbidden || string.IsNullOrWhiteSpace(registration.name))
                {
                    result.Skipped++;
                    continue;
                }

                // Idempotent: don't create a channel that already exists.
                var name = registration.name.ToLower();
                var exists = await db.Channels.AnyAsync(c => c.Name != null && c.Name.ToLower() == name);
                if (exists)
                {
                    result.Skipped++;
                    continue;
                }

                var user = await userManager.FindByNameAsync(registration.founder)
                    ?? await userManager.FindByNameAsync(registration.successor);

                if (user == null)
                {
                    result.Skipped++;
                    continue;
                }

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
                result.Created++;
            }

            return result;
        }

        private async Task<ImportResult> ImportModerators(AnopeChannelModerator[] moderators)
        {
            var result = new ImportResult();
            if (moderators == null)
            {
                return result;
            }

            foreach (AnopeChannelModerator moderator in moderators)
            {
                var user = await userManager.FindByNameAsync(moderator.nick);
                var channel = await db.Channels.FirstOrDefaultAsync(ch => ch.Name == moderator.channel);

                if (user == null || channel == null)
                {
                    result.Skipped++;
                    continue;
                }

                // Idempotent: don't add someone who's already a mod of this channel.
                var already = await db.ChannelModerators
                    .AnyAsync(m => m.UserId == user.Id && m.ChannelId == channel.Id);
                if (already)
                {
                    result.Skipped++;
                    continue;
                }

                var mod = new ChannelModerator()
                {
                    Channel = channel,
                    Created = DateTime.UtcNow,
                    Level = MapModeratorLevel(moderator.level),
                    User = user
                };

                await db.ChannelModerators.AddAsync(mod);
                await db.SaveChangesAsync();
                result.Created++;
            }

            return result;
        }

        /// <summary>Map an Anope channel level to Rambler's two moderator tiers.</summary>
        private static ModerationLevel MapModeratorLevel(ChannelModeratorLevels level)
        {
            // sop (super-op) and aop (op) get full operator control; hop (half-op)
            // and vop (voice) map to the lower moderator tier.
            switch (level)
            {
                case ChannelModeratorLevels.sop:
                case ChannelModeratorLevels.aop:
                    return ModerationLevel.Admin;
                default:
                    return ModerationLevel.Moderator;
            }
        }

        /// <summary>How many records an import created versus skipped.</summary>
        public class ImportResult
        {
            public int Created { get; set; }

            public int Skipped { get; set; }
        }

        /// <summary>Per-section results for a full import.</summary>
        public class ImportSummary
        {
            public ImportResult Users { get; set; }

            public ImportResult Channels { get; set; }

            public ImportResult Moderators { get; set; }
        }
    }
}
