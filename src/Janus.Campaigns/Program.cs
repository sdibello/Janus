using Janus.Campaigns.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var dataDirectory = builder.Configuration["Janus:DataDirectory"]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Janus");
Directory.CreateDirectory(dataDirectory);
var databasePath = Path.Combine(dataDirectory, "janus.db");
var connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();

builder.Services.AddDbContext<CampaignDataContext>(options =>
    options.UseSqlite(connectionString, sqlite => sqlite.MigrationsHistoryTable("__JanusCampaignMigrations")));

var app = builder.Build();

app.MapGet("/health", async (CampaignDataContext data, CancellationToken cancellationToken) =>
{
    try
    {
        var pending = await data.Database.GetPendingMigrationsAsync(cancellationToken);
        return pending.Any()
            ? Results.StatusCode(StatusCodes.Status503ServiceUnavailable)
            : Results.Ok(new { service = "janus-campaigns", status = "ready" });
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.Run();
