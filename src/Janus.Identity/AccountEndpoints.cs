using System.Net;
using System.Security.Cryptography;
using System.Text;
using Janus.Identity.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication;

namespace Janus.Identity;

public static class AccountEndpoints
{
    private const string SharedAdministratorRole = "SharedAdministrator";
    private const string CampaignProductId = "janus-campaigns";

    public static void MapAccountEndpoints(this WebApplication app)
    {
        app.MapPost("/account/register", RegisterAsync).RequireRateLimiting("account-write");
        app.MapPost("/account/verify-email", VerifyEmailAsync).RequireRateLimiting("account-write");
        app.MapPost("/account/login", LoginAsync).RequireRateLimiting("login-attempt");
        app.MapPost("/account/logout", async (SignInManager<JanusUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.Ok(new { message = "Signed out." });
        }).RequireAuthorization();
        app.MapGet("/account/me", MeAsync).RequireAuthorization();
        app.MapPost("/account/activity", RecordActivityAsync).RequireAuthorization();
        app.MapGet("/products", async (IdentityDataContext data) =>
            Results.Ok(await data.Products.OrderBy(product => product.Name)
                .Select(product => new { product.Id, product.Name }).ToListAsync()));
        app.MapPost("/admin/invitations", CreateInvitationAsync).RequireAuthorization()
            .RequireRateLimiting("account-write");

        if (app.Environment.IsDevelopment())
        {
            app.MapGet("/dev/inbox", async (HttpContext context, IdentityDataContext data) =>
            {
                var host = context.Request.Host.Host;
                if (context.Connection.RemoteIpAddress is not { } address || !IPAddress.IsLoopback(address)
                    || !string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
                        && host is not "127.0.0.1" and not "::1")
                    return Results.NotFound();

                context.Response.Headers.CacheControl = "no-store";
                var messages = await data.LocalMailMessages.OrderByDescending(message => message.CreatedAtUtc)
                    .Select(message => new { message.Recipient, message.Subject, message.ActionUrl, message.CreatedAtUtc })
                    .Take(100).ToListAsync();
                return Results.Ok(messages);
            });
        }
    }

    private static async Task<IResult> RegisterAsync(
        RegisterRequest request, IdentityDataContext data, UserManager<JanusUser> users,
        IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(request.Invitation) || request.Invitation.Length != 43
            || string.IsNullOrWhiteSpace(request.UserName)
            || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            return Results.BadRequest(new { message = "Invitation, username, email, and password are required." });

        var invitationHash = HashToken(request.Invitation);
        var invitation = await data.RegistrationInvitations.SingleOrDefaultAsync(item => item.TokenHash == invitationHash);
        if (invitation is null || invitation.ExpiresAtUtc <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "This invitation is invalid or expired." });

        var user = new JanusUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            PendingProductId = invitation.ProductId,
        };

        await using var transaction = await data.Database.BeginTransactionAsync();
        IdentityResult created;
        try
        {
            created = await users.CreateAsync(user, request.Password);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return Results.BadRequest(new { message = "Could not create an account with those details." });
        }
        if (!created.Succeeded)
        {
            await transaction.RollbackAsync();
            var passwordError = created.Errors.FirstOrDefault(error => error.Code.StartsWith("Password", StringComparison.Ordinal));
            return Results.BadRequest(new
            {
                message = passwordError?.Description ?? "Could not create an account with those details.",
            });
        }

        await CaptureVerificationAsync(data, users, user, configuration);
        if (invitation.ExpiresAtUtc <= DateTime.UtcNow)
        {
            await transaction.RollbackAsync();
            return Results.BadRequest(new { message = "This invitation is invalid or expired." });
        }
        await transaction.CommitAsync();
        return Results.Ok(new { message = "Account created. Open the local test inbox and verify your email before signing in." });
    }

    private static async Task<IResult> VerifyEmailAsync(
        VerifyEmailRequest request, IdentityDataContext data, UserManager<JanusUser> users)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Token))
            return Results.BadRequest(new { message = "Invalid verification link." });

        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || user.EmailConfirmed)
            return Results.BadRequest(new { message = "Invalid or already used verification link." });

        await using var transaction = await data.Database.BeginTransactionAsync();
        var confirmed = await users.ConfirmEmailAsync(user, request.Token);
        if (!confirmed.Succeeded)
            return Results.BadRequest(new { message = "Invalid or expired verification link." });

        if (user.PendingProductId is { } productId)
        {
            data.ProductGrants.Add(new ProductGrant
            {
                UserId = user.Id,
                ProductId = productId,
                GrantedAtUtc = DateTime.UtcNow,
            });
            user.PendingProductId = null;
            await users.UpdateAsync(user);
        }

        await data.SaveChangesAsync();
        await transaction.CommitAsync();
        return Results.Ok(new { message = "Email verified. You can now sign in." });
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request, UserManager<JanusUser> users, SignInManager<JanusUser> signIn)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrEmpty(request.Password))
            return Results.BadRequest(new { message = "Username or email and password are required." });

        var identifier = request.Identifier.Trim();
        var user = identifier.Contains('@')
            ? await users.FindByEmailAsync(identifier)
            : await users.FindByNameAsync(identifier);
        if (user is null)
            return Results.Unauthorized();

        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded) return Results.Unauthorized();

        await signIn.SignInAsync(user, IdentitySessionLifetime.Create(request.RememberMe));
        return Results.Ok(new { message = "Signed in." });
    }

    private static async Task<IResult> RecordActivityAsync(
        HttpContext context, UserManager<JanusUser> users, SignInManager<JanusUser> signIn)
    {
        var session = await context.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (session.Properties?.IsPersistent != true)
            return Results.NoContent();

        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();

        await signIn.SignInAsync(user, IdentitySessionLifetime.Create(rememberMe: true));
        return Results.NoContent();
    }

    private static async Task<IResult> MeAsync(
        HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();

        var products = await data.ProductGrants.Where(grant => grant.UserId == user.Id)
            .Select(grant => grant.ProductId).ToListAsync();
        var administeredProducts = await data.ProductAdministrators
            .Where(administrator => administrator.UserId == user.Id)
            .Select(administrator => administrator.ProductId).ToListAsync();
        return Results.Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            Products = products,
            AdministeredProducts = administeredProducts,
            IsSharedAdministrator = await users.IsInRoleAsync(user, SharedAdministratorRole),
        });
    }

    private static async Task<IResult> CreateInvitationAsync(
        CreateInvitationRequest request, HttpContext context, IdentityDataContext data,
        UserManager<JanusUser> users, IConfiguration configuration)
    {
        var user = await users.GetUserAsync(context.User);
        if (string.IsNullOrWhiteSpace(request.ProductId)
            || !await data.Products.AnyAsync(product => product.Id == request.ProductId))
            return Results.BadRequest(new { message = "Unknown product." });
        if (user is null || !await AccessEndpoints.CanManageProductAsync(data, users, user, request.ProductId))
            return Results.Forbid();

        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var expiresAt = DateTime.UtcNow.AddHours(24);
        data.RegistrationInvitations.Add(new RegistrationInvitation
        {
            Id = Guid.NewGuid(),
            TokenHash = HashToken(token),
            ProductId = request.ProductId,
            IssuedByUserId = user.Id,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = expiresAt,
        });
        await data.SaveChangesAsync();

        var url = PortalUrl(configuration, $"?invite={Uri.EscapeDataString(token)}");
        context.Response.Headers.CacheControl = "no-store";
        return Results.Ok(new { url, expiresAt });
    }

    public static async Task SetupAdministratorAsync(WebApplication app)
    {
        if (Console.IsInputRedirected)
            throw new InvalidOperationException("Administrator setup requires an interactive terminal.");

        await using var scope = app.Services.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<IdentityDataContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<JanusUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        if ((await data.Database.GetPendingMigrationsAsync()).Any())
            throw new InvalidOperationException("Apply the identity migrations before administrator setup.");
        if ((await users.GetUsersInRoleAsync(SharedAdministratorRole)).Count > 0)
            throw new InvalidOperationException("A shared administrator already exists.");

        Console.Write("Administrator username: ");
        var name = Console.ReadLine()?.Trim();
        Console.Write("Administrator email: ");
        var email = Console.ReadLine()?.Trim();
        Console.Write("Administrator password: ");
        var password = ReadPassword();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Username and email are required.");

        if (!await roles.RoleExistsAsync(SharedAdministratorRole))
        {
            var roleResult = await roles.CreateAsync(new IdentityRole(SharedAdministratorRole));
            if (!roleResult.Succeeded) throw new InvalidOperationException("Could not create administrator role.");
        }

        await using var transaction = await data.Database.BeginTransactionAsync();
        var user = new JanusUser { UserName = name, Email = email, PendingProductId = CampaignProductId };
        var created = await users.CreateAsync(user, password);
        if (!created.Succeeded)
            throw new InvalidOperationException(string.Join(" ", created.Errors.Select(error => error.Description)));
        var assigned = await users.AddToRoleAsync(user, SharedAdministratorRole);
        if (!assigned.Succeeded)
            throw new InvalidOperationException("Could not assign administrator role.");
        await CaptureVerificationAsync(data, users, user, app.Configuration);
        await transaction.CommitAsync();
        Console.WriteLine("Administrator created. Open the local test inbox to verify the email, then sign in.");
    }

    private static async Task CaptureVerificationAsync(
        IdentityDataContext data, UserManager<JanusUser> users, JanusUser user, IConfiguration configuration)
    {
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        var query = $"?verifyUser={Uri.EscapeDataString(user.Id)}&verifyToken={Uri.EscapeDataString(token)}";
        data.LocalMailMessages.Add(new LocalMailMessage
        {
            Id = Guid.NewGuid(),
            Recipient = user.Email!,
            Subject = "Verify your Janus email address",
            ActionUrl = PortalUrl(configuration, query),
            CreatedAtUtc = DateTime.UtcNow,
        });
        await data.SaveChangesAsync();
    }

    private static string PortalUrl(IConfiguration configuration, string query) =>
        $"{(configuration["Janus:PortalBaseUrl"] ?? "http://localhost:5173").TrimEnd('/')}/portal.html{query}";

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string ReadPassword()
    {
        var password = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0) password.Length--;
            }
            else if (!char.IsControl(key.KeyChar)) password.Append(key.KeyChar);
        }
        Console.WriteLine();
        return password.ToString();
    }

    private sealed record RegisterRequest(string Invitation, string UserName, string Email, string Password);
    private sealed record VerifyEmailRequest(string UserId, string Token);
    private sealed record LoginRequest(string Identifier, string Password, bool RememberMe);
    private sealed record CreateInvitationRequest(string ProductId);
}
