using System.Text.Json.Serialization;
using Janus.Campaigns;
using Janus.Campaigns.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var dataDirectory = builder.Configuration["Janus:DataDirectory"]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Janus");
Directory.CreateDirectory(dataDirectory);
var databasePath = Path.Combine(dataDirectory, "janus.db");
var connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
var identityBaseUrl = builder.Configuration["Janus:IdentityBaseUrl"] ?? "http://localhost:5186";
var webBaseUrl = builder.Configuration["Janus:WebBaseUrl"] ?? "http://localhost:5173";
const string campaignCookie = CampaignAccessService.CookieScheme;

var keyDirectory = Path.Combine(dataDirectory, "campaign-keys");
Directory.CreateDirectory(keyDirectory);
builder.Services.AddDataProtection().SetApplicationName("Janus.Campaigns")
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

builder.Services.AddDbContext<CampaignDataContext>(options =>
    options.UseSqlite(connectionString, sqlite => sqlite.MigrationsHistoryTable("__JanusCampaignMigrations")));
builder.Services.AddSingleton<CampaignSessionStore>();
builder.Services.AddOptions<CookieAuthenticationOptions>(campaignCookie)
    .PostConfigure<CampaignSessionStore>((options, store) => options.SessionStore = store);
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = campaignCookie;
        options.DefaultSignInScheme = campaignCookie;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(campaignCookie, options =>
    {
        options.Cookie.Name = campaignCookie;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = false;
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
    })
    .AddOpenIdConnect(options =>
    {
        options.Authority = identityBaseUrl;
        options.ClientId = "janus-campaigns";
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.ResponseMode = OpenIdConnectResponseMode.Query;
        options.UsePkce = true;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveTokens = true;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.MapInboundClaims = false;
        options.SignInScheme = campaignCookie;
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.TokenValidationParameters.NameClaimType = "name";
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.NonceCookie.SameSite = SameSiteMode.Lax;
        options.NonceCookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.Events.OnRedirectToIdentityProvider = context =>
        {
            if (context.Properties.Items.ContainsKey("janus:silent"))
                context.ProtocolMessage.Prompt = "none";
            return Task.CompletedTask;
        };
        options.Events.OnRemoteFailure = context =>
        {
            var query = context.Properties?.Items.ContainsKey("janus:silent") == true
                ? "silent=done" : "signInError=access_denied";
            context.Response.Redirect($"{webBaseUrl.TrimEnd('/')}?{query}");
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
builder.Services.AddHttpClient("identity-access", client => client.BaseAddress = new Uri(identityBaseUrl));
builder.Services.AddScoped<CampaignAccessService>();
builder.Services.AddAuthorization();
var identityOrigin = new Uri(identityBaseUrl).GetLeftPart(UriPartial.Authority);
builder.Services.AddCors(options => options.AddPolicy("identity-browser", policy => policy
    .WithOrigins(identityOrigin).AllowAnyHeader().WithMethods("GET")));

var app = builder.Build();
app.UseRouting();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.Use(async (context, next) =>
{
    if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method)
        && context.Request.Headers.Cookie.Count > 0)
    {
        var allowedWebOrigin = new Uri(webBaseUrl).GetLeftPart(UriPartial.Authority);
        var requestOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
        var origin = context.Request.Headers.Origin.ToString();
        if (origin.Length == 0 || !string.Equals(origin, allowedWebOrigin, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(origin, requestOrigin, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }
    await next();
});
app.UseAuthentication();
app.UseAuthorization();

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
}).RequireCors("identity-browser");

app.MapGet("/auth/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = webBaseUrl.TrimEnd('/') + "/" },
    [OpenIdConnectDefaults.AuthenticationScheme]));

app.MapGet("/auth/try-sign-in", () =>
{
    var properties = new AuthenticationProperties
    {
        RedirectUri = webBaseUrl.TrimEnd('/') + "/",
    };
    properties.Items["janus:silent"] = "true";
    return Results.Challenge(properties, [OpenIdConnectDefaults.AuthenticationScheme]);
});

app.MapGet("/auth/me", async (HttpContext context, CampaignAccessService access,
    CancellationToken cancellationToken) =>
{
    context.Response.Headers.CacheControl = "no-store";
    var result = await access.CheckAsync(context, cancellationToken);
    return result.Profile is null ? result.Failure() : Results.Ok(result.Profile);
});

app.MapCampaignEndpoints();
app.MapEncounterEndpoints();

app.MapPost("/auth/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(campaignCookie);
    return Results.Ok(new { message = "Signed out of Janus campaigns." });
});

app.Run();
