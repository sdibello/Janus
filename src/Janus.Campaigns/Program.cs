using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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

var dataDirectory = builder.Configuration["Janus:DataDirectory"]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Janus");
Directory.CreateDirectory(dataDirectory);
var databasePath = Path.Combine(dataDirectory, "janus.db");
var connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
var identityBaseUrl = builder.Configuration["Janus:IdentityBaseUrl"] ?? "http://localhost:5186";
var webBaseUrl = builder.Configuration["Janus:WebBaseUrl"] ?? "http://localhost:5173";
const string campaignCookie = "Janus.Campaign";

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
builder.Services.AddAuthorization();

var app = builder.Build();
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
});

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

app.MapGet("/auth/me", async (HttpContext context, IHttpClientFactory clients,
    CancellationToken cancellationToken) =>
{
    context.Response.Headers.CacheControl = "no-store";
    var session = await context.AuthenticateAsync(campaignCookie);
    if (!session.Succeeded || session.Properties?.GetTokenValue("access_token") is not { } token)
        return Results.Unauthorized();

    using var request = new HttpRequestMessage(HttpMethod.Get, "/connect/access/janus-campaigns");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    try
    {
        using var response = await clients.CreateClient("identity-access")
            .SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.Forbidden) return Results.Forbid();
        if (response.StatusCode == HttpStatusCode.Unauthorized) return Results.Unauthorized();
        if (!response.IsSuccessStatusCode) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        var profile = await response.Content.ReadFromJsonAsync<CampaignUserProfile>(cancellationToken);
        return profile is null ? Results.StatusCode(StatusCodes.Status503ServiceUnavailable)
            : Results.Ok(profile);
    }
    catch (HttpRequestException) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }
});

app.MapPost("/auth/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(campaignCookie);
    return Results.Ok(new { message = "Signed out of Janus campaigns." });
});

app.Run();

internal sealed record CampaignUserProfile(string UserId, string UserName, string Email, string ProductId);
