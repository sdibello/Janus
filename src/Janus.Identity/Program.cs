using Janus.Identity.Persistence;
using Janus.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("account-write", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

builder.Services.AddDbContext<IdentityDataContext>(options =>
    options.UseSqlite(connectionString, sqlite => sqlite.MigrationsHistoryTable("__JanusIdentityMigrations"))
        .UseOpenIddict());

builder.Services.AddIdentityCore<JanusUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<IdentityDataContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();
builder.Services.AddScoped<IPasswordValidator<JanusUser>, CommonPasswordValidator>();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.SignIn.RequireConfirmedEmail = true;
    options.User.RequireUniqueEmail = true;
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._";
    options.Password.RequiredLength = 15;
    options.Password.RequiredUniqueChars = 1;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
});

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromDays(30);
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddOpenIddict()
    .AddCore(options => options.UseEntityFrameworkCore().UseDbContext<IdentityDataContext>());

var app = builder.Build();

if (args.Contains("--setup-admin", StringComparer.Ordinal))
{
    await AccountEndpoints.SetupAdministratorAsync(app);
    return;
}

app.UseRouting();
app.Use(async (context, next) =>
{
    if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method)
        && context.Request.Headers.Origin is { Count: > 0 } origin)
    {
        var portalOrigin = new Uri(builder.Configuration["Janus:PortalBaseUrl"] ?? "http://localhost:5173")
            .GetLeftPart(UriPartial.Authority);
        var requestOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
        if (!string.Equals(origin.ToString(), portalOrigin, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(origin.ToString(), requestOrigin, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }
    await next();
});
app.UseRateLimiter();
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

app.MapAccountEndpoints();

app.Run();
