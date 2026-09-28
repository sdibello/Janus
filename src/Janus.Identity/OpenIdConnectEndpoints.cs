using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Janus.Identity.Persistence;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace Janus.Identity;

public static class OpenIdConnectEndpoints
{
    private const string CampaignClientId = "janus-campaigns";
    private const string ProofClientId = "janus-session-proof";
    private const string StampClaim = "janus:security_stamp";
    private const string ProductClaim = "janus:product";

    public static async Task RegisterLocalClientAsync(WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<IdentityDataContext>();
        if ((await data.Database.GetPendingMigrationsAsync()).Any()) return;

        var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();
        var clients = new List<(string Id, string Name, string Redirect)>
        {
            (CampaignClientId, "Janus campaigns",
                app.Configuration["Janus:CampaignClientRedirectUri"] ?? "http://localhost:5199/signin-oidc"),
        };
        if (app.Environment.IsDevelopment())
            clients.Add((ProofClientId, "Janus session proof",
                app.Configuration["Janus:ProofClientRedirectUri"] ?? "http://localhost:5201/signin-oidc"));

        foreach (var client in clients)
        {
            if (!Uri.TryCreate(client.Redirect, UriKind.Absolute, out var redirectUri)
                || !app.Environment.IsDevelopment() && redirectUri.Scheme != Uri.UriSchemeHttps
                || app.Environment.IsDevelopment() && redirectUri.Scheme == Uri.UriSchemeHttp
                    && !redirectUri.IsLoopback)
                throw new InvalidOperationException($"Configure a valid, secure redirect URI for {client.Id}.");
            if (await manager.FindByClientIdAsync(client.Id) is not null) continue;

            await manager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = client.Id,
                ClientType = ClientTypes.Public,
                ConsentType = ConsentTypes.Implicit,
                DisplayName = client.Name,
                RedirectUris = { redirectUri },
                Permissions =
                {
                    Permissions.Endpoints.Authorization,
                    Permissions.Endpoints.Token,
                    Permissions.GrantTypes.AuthorizationCode,
                    Permissions.ResponseTypes.Code,
                    Permissions.Scopes.Email,
                    Permissions.Scopes.Profile,
                },
            });
        }
    }

    public static void MapOpenIdConnectEndpoints(this WebApplication app)
    {
        app.MapGet("/connect/authorize", AuthorizeAsync);
        app.MapPost("/connect/token", ExchangeAsync);
        app.MapGet("/connect/access/{productId}", CheckTokenAccessAsync)
            .RequireAuthorization(new AuthorizeAttribute
            {
                AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme,
            });
    }

    private static async Task<IResult> AuthorizeAsync(
        HttpContext context, UserManager<JanusUser> users, IdentityDataContext data,
        IConfiguration configuration)
    {
        var request = context.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("OpenID Connect request unavailable.");
        if (request.CodeChallengeMethod != CodeChallengeMethods.Sha256)
            return Deny(Errors.InvalidRequest);
        var user = await users.GetUserAsync(context.User);
        if (user is null)
        {
            if (request.HasPromptValue(PromptValues.None)) return Deny(Errors.LoginRequired);
            var portal = configuration["Janus:PortalBaseUrl"] ?? "http://localhost:5173";
            var returnTo = context.Request.GetEncodedUrl();
            return Results.Redirect($"{portal.TrimEnd('/')}/portal.html?returnTo={Uri.EscapeDataString(returnTo)}");
        }

        if (!user.EmailConfirmed || request.ClientId is null
            || !await data.ProductGrants.AsNoTracking().AnyAsync(grant =>
                grant.ProductId == request.ClientId && grant.UserId == user.Id))
            return Deny(Errors.AccessDenied);

        var identity = new ClaimsIdentity(TokenValidationParameters.DefaultAuthenticationType, Claims.Name, Claims.Role);
        identity.SetClaim(Claims.Subject, user.Id);
        identity.SetClaim(Claims.Name, user.UserName);
        identity.SetClaim(Claims.Email, user.Email);
        identity.SetClaim(StampClaim, HashStamp(await users.GetSecurityStampAsync(user)));
        identity.SetClaim(ProductClaim, request.ClientId);
        identity.SetScopes(request.GetScopes());
        identity.SetDestinations(claim => claim.Type switch
        {
            Claims.Name when claim.Subject!.HasScope(Scopes.Profile) => [Destinations.IdentityToken],
            Claims.Email when claim.Subject!.HasScope(Scopes.Email) => [Destinations.IdentityToken],
            ProductClaim => [Destinations.AccessToken],
            StampClaim => [Destinations.AccessToken],
            _ => [],
        });
        return Results.SignIn(new ClaimsPrincipal(identity), authenticationScheme:
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    private static async Task<IResult> ExchangeAsync(
        HttpContext context, UserManager<JanusUser> users, IdentityDataContext data)
    {
        var request = context.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("OpenID Connect request unavailable.");
        if (!request.IsAuthorizationCodeGrantType()) return Deny(Errors.UnsupportedGrantType);

        var authentication = await context.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        var principal = authentication.Principal;
        var subject = principal?.GetClaim(Claims.Subject);
        var user = subject is null ? null : await users.FindByIdAsync(subject);
        if (user is null || principal is null || !user.EmailConfirmed || request.ClientId is null
            || principal.GetClaim(StampClaim) != HashStamp(await users.GetSecurityStampAsync(user))
            || principal.GetClaim(ProductClaim) != request.ClientId
            || !await data.ProductGrants.AsNoTracking().AnyAsync(grant =>
                grant.ProductId == request.ClientId && grant.UserId == user.Id))
            return Deny(Errors.InvalidGrant);

        var identity = new ClaimsIdentity(principal.Claims,
            TokenValidationParameters.DefaultAuthenticationType, Claims.Name, Claims.Role);
        identity.SetClaim(Claims.Name, user.UserName);
        identity.SetClaim(Claims.Email, user.Email);
        identity.SetDestinations(claim => claim.Type switch
        {
            Claims.Name when claim.Subject!.HasScope(Scopes.Profile) => [Destinations.IdentityToken],
            Claims.Email when claim.Subject!.HasScope(Scopes.Email) => [Destinations.IdentityToken],
            ProductClaim => [Destinations.AccessToken],
            StampClaim => [Destinations.AccessToken],
            _ => [],
        });
        return Results.SignIn(new ClaimsPrincipal(identity), authenticationScheme:
            OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    private static async Task<IResult> CheckTokenAccessAsync(
        string productId, HttpContext context, UserManager<JanusUser> users, IdentityDataContext data)
    {
        context.Response.Headers.CacheControl = "no-store";
        var subject = context.User.GetClaim(Claims.Subject);
        if (subject is null || context.User.GetClaim(ProductClaim) != productId)
            return Results.Forbid();

        var user = await users.FindByIdAsync(subject);
        if (user is null || !user.EmailConfirmed
            || context.User.GetClaim(StampClaim) != HashStamp(await users.GetSecurityStampAsync(user))
            || !await data.ProductGrants.AsNoTracking().AnyAsync(grant =>
                grant.UserId == subject && grant.ProductId == productId))
            return Results.Forbid();

        return Results.Ok(new { userId = user.Id, userName = user.UserName, email = user.Email, productId });
    }

    private static string HashStamp(string stamp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(stamp)));

    private static IResult Deny(string error) => Results.Forbid(
        new AuthenticationProperties(new Dictionary<string, string?>
        {
            [OpenIddictServerAspNetCoreConstants.Properties.Error] = error,
        }), [OpenIddictServerAspNetCoreDefaults.AuthenticationScheme]);
}
