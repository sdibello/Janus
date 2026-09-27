using Janus.Identity.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var dataDirectory = builder.Configuration["Janus:DataDirectory"]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Janus");
Directory.CreateDirectory(dataDirectory);
var databasePath = Path.Combine(dataDirectory, "janus.db");
var connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
var keyDirectory = Path.Combine(dataDirectory, "keys");
Directory.CreateDirectory(keyDirectory);

builder.Services.AddDataProtection()
    .SetApplicationName("Janus.Identity")
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();
builder.Services.AddAuthorization();

builder.Services.AddDbContext<IdentityDataContext>(options =>
    options.UseSqlite(connectionString, sqlite => sqlite.MigrationsHistoryTable("__JanusIdentityMigrations"))
        .UseOpenIddict());

builder.Services.AddIdentityCore<JanusUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<IdentityDataContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.AddOpenIddict()
    .AddCore(options => options.UseEntityFrameworkCore().UseDbContext<IdentityDataContext>());

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", async (IdentityDataContext data, CancellationToken cancellationToken) =>
{
    try
    {
        var pending = await data.Database.GetPendingMigrationsAsync(cancellationToken);
        return pending.Any()
            ? Results.StatusCode(StatusCodes.Status503ServiceUnavailable)
            : Results.Ok(new { service = "janus-identity", status = "ready" });
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

app.Run();
