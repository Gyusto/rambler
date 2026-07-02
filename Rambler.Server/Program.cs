namespace Rambler.Server
{
    using Database;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.Extensions.DependencyInjection;
    using System.Net;

    class Program
    {
        public static void Main(string[] args)
        {
            BuildWebHost(args)
                // these happen outside buildwebhost so EF keeps working
                // https://stackoverflow.com/questions/45148389/how-to-seed-in-entity-framework-core-2
                // apply any pending migrations before seeding (idempotent; no-op if already current)
                .Initialize(provider => provider.GetRequiredService<ApplicationDbContext>().Database.Migrate())
                .InitializeService<InitializeChannels>(c => c.SeedLobby())
                .InitializeService<InitializeBots>(b => b.SeedBots())
                .InitializeService<InitializeBots>(b => b.LoadBots())
                .Run();
        }

        public static IWebHost BuildWebHost(string[] args) => new WebHostBuilder()
                .UseKestrel()
                .UseStartup<Startup>()
                .Build();

    }
}