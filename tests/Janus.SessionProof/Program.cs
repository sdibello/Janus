using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

// A development-only second product. It proves the shared identity contract and
// independent product sessions; it is not a production session-storage template.
const string productId = "janus-session-proof";
const string cookie = "Janus.SessionProof";
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
if (!builder.Environment.IsDevelopment())
    throw new InvalidOperationException("The session proof client runs only in Development.");
var identityBaseUrl = builder.Configuration["Janus:IdentityBaseUrl"] ?? "http://localhost:5186";
var clientBaseUrl = builder.Configuration["Janus:ProofBaseUrl"] ?? "http://localhost:5201";
var dataDirectory = builder.Configuration["Janus:DataDirectory"]
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Janus");
var keyDirectory = Path.Combine(dataDirectory, "proof-keys");
Directory.CreateDirectory(keyDirectory);
builder.Services.AddDataProtection().SetApplicationName("Janus.SessionProof")
    .PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = cookie;
        options.DefaultSignInScheme = cookie;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(cookie, options =>
    {
        options.Cookie.Name = cookie;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = false;
    })
    .AddOpenIdConnect(options =>
    {
        options.Authority = identityBaseUrl;
        options.ClientId = productId;
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.ResponseMode = OpenIdConnectResponseMode.Query;
        options.UsePkce = true;
        options.RequireHttpsMetadata = false;
        options.SaveTokens = true;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.MapInboundClaims = false;
        options.SignInScheme = cookie;
        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.NonceCookie.SameSite = SameSiteMode.Lax;
        options.NonceCookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Events.OnRedirectToIdentityProvider = context =>
        {
            if (context.Properties.Items.ContainsKey("janus:silent"))
                context.ProtocolMessage.Prompt = "none";
            return Task.CompletedTask;
        };
        options.Events.OnRemoteFailure = context =>
        {
            context.Response.Redirect($"{clientBaseUrl.TrimEnd('/')}/auth/denied");
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
builder.Services.AddHttpClient("identity", client => client.BaseAddress = new Uri(identityBaseUrl));
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/auth/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = $"{clientBaseUrl.TrimEnd('/')}/auth/me" },
    [OpenIdConnectDefaults.AuthenticationScheme]));
app.MapGet("/auth/try-sign-in", () =>
{
    var properties = new AuthenticationProperties
    {
        RedirectUri = $"{clientBaseUrl.TrimEnd('/')}/auth/me",
    };
    properties.Items["janus:silent"] = "true";
    return Results.Challenge(properties, [OpenIdConnectDefaults.AuthenticationScheme]);
});
app.MapGet("/auth/denied", () => Results.StatusCode(StatusCodes.Status403Forbidden));
app.MapGet("/auth/me", async (HttpContext context, IHttpClientFactory clients,
    CancellationToken cancellationToken) =>
{
    context.Response.Headers.CacheControl = "no-store";
    var session = await context.AuthenticateAsync(cookie);
    if (!session.Succeeded || session.Properties?.GetTokenValue("access_token") is not { } token)
        return Results.Unauthorized();
    using var request = new HttpRequestMessage(HttpMethod.Get, $"/connect/access/{productId}");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    try
    {
        using var response = await clients.CreateClient("identity").SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.Unauthorized) return Results.Unauthorized();
        if (response.StatusCode == HttpStatusCode.Forbidden)
            return Results.StatusCode(StatusCodes.Status403Forbidden);
        if (!response.IsSuccessStatusCode) return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        return Results.Content(await response.Content.ReadAsStringAsync(cancellationToken), "application/json");
    }
    catch (HttpRequestException) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }
});
app.MapPost("/auth/logout", async (HttpContext context) =>
{
    if (!string.Equals(context.Request.Headers.Origin, clientBaseUrl.TrimEnd('/'),
            StringComparison.OrdinalIgnoreCase))
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    await context.SignOutAsync(cookie);
    return Results.Ok();
});

app.Run();
