namespace Rambler.Server.WebService.Controllers
{
    using Contracts.Api;
    using Contracts.Responses;
    using Database;
    using Database.Models;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Identity;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.Logging;
    using State;
    using System;
    using System.Linq;
    using System.Threading.Tasks;

    [Authorize]
    public class BotController : ControllerBase
    {
        readonly ILogger logger;
        readonly StateMutator mutator;
        readonly ApplicationDbContext db;
        readonly UserManager<ApplicationUser> userManager;

        public BotController(
            StateMutator mutator,
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            ILogger<BotController> logger)
        {
            this.logger = logger;
            this.mutator = mutator;
            this.db = db;
            this.userManager = userManager;
        }

        // list the current user's bots
        [HttpGet]
        public async Task<IActionResult> GetBots()
        {
            var user = await userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var bots = await db.Bots
                .Where(b => b.OwnerId == user.Id)
                .Select(b => new BotDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    Description = b.Description,
                    IsEnabled = b.IsEnabled,
                    EndPoint = b.EndPoint,
                    HasToken = !string.IsNullOrEmpty(b.Token),
                })
                .ToListAsync();

            return Ok(bots);
        }

        // get (or lazily mint) the api token for a bot the caller owns
        [HttpGet]
        public async Task<IActionResult> GetToken(Guid botId)
        {
            var user = await userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var bot = await db.Bots
                .FirstOrDefaultAsync(b => b.Id == botId && b.OwnerId == user.Id);

            if (bot == null)
            {
                return NotFound("No such bot, or you don't own it.");
            }

            if (string.IsNullOrEmpty(bot.Token))
            {
                bot.Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
                db.Bots.Update(bot);
                await db.SaveChangesAsync();
            }

            return Ok(bot.Token);
        }

        // send notification to channel

        // ... whatever other actions we like
    }

    /// <summary>Lightweight bot summary returned to the owner (never leaks the token).</summary>
    public class BotDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsEnabled { get; set; }
        public string EndPoint { get; set; }
        public bool HasToken { get; set; }
    }
}
