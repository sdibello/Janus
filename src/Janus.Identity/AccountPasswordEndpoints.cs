using System.Security.Cryptography;
using System.Diagnostics;
using System.Text;
using Janus.Identity.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace Janus.Identity;

public static class AccountPasswordEndpoints
{
    private static readonly object RecoveryResponse = new
    {
        message = "If a verified account uses that email address, password reset instructions are available in the local test inbox.",
    };

    public static void MapAccountPasswordEndpoints(this WebApplication app)
    {
        app.MapPost("/account/request-password-reset", RequestPasswordResetAsync)
            .RequireRateLimiting("password-recovery");
        app.MapPost("/account/reset-password", ResetPasswordAsync)
            .RequireRateLimiting("account-write");
        app.MapPost("/account/change-password", ChangePasswordAsync)
            .RequireAuthorization()
            .RequireRateLimiting("account-write");
    }

    private static async Task<IResult> RequestPasswordResetAsync(
        RequestPasswordResetRequest request, IdentityDataContext data,
        UserManager<JanusUser> users, IConfiguration configuration)
    {
        var startedAt = Stopwatch.GetTimestamp();
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email.Length <= 256)
        {
            var user = await users.FindByEmailAsync(request.Email.Trim());
            if (user is not null && await users.IsEmailConfirmedAsync(user))
            {
                // The random prefix keeps two requests distinct even if the Identity token
                // provider returns the same proof within one timestamp interval.
                var token = $"{WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16))}.{await users.GeneratePasswordResetTokenAsync(user)}";
                var now = DateTime.UtcNow;
                data.PasswordResetProofs.Add(new PasswordResetProof
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    TokenHash = HashToken(token),
                    CreatedAtUtc = now,
                    ExpiresAtUtc = now.AddHours(1),
                });

                var query = $"?resetUser={Uri.EscapeDataString(user.Id)}&resetToken={Uri.EscapeDataString(token)}";
                data.LocalMailMessages.Add(new LocalMailMessage
                {
                    Id = Guid.NewGuid(),
                    Recipient = user.Email!,
                    Subject = "Reset your Janus password",
                    ActionUrl = PortalUrl(configuration, query),
                    CreatedAtUtc = now,
                });
                await data.SaveChangesAsync();
            }
        }

        // Keep the user-facing request time similar for known and unknown addresses.
        var remaining = TimeSpan.FromMilliseconds(400) - Stopwatch.GetElapsedTime(startedAt);
        if (remaining > TimeSpan.Zero) await Task.Delay(remaining);
        return Results.Ok(RecoveryResponse);
    }

    private static async Task<IResult> ResetPasswordAsync(
        ResetPasswordRequest request, IdentityDataContext data, UserManager<JanusUser> users)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || request.UserId.Length > 200
            || string.IsNullOrWhiteSpace(request.Token) || request.Token.Length > 4096
            || string.IsNullOrEmpty(request.NewPassword))
            return Results.BadRequest(new { message = "Invalid or expired password reset link." });

        await using var transaction = await data.Database.BeginTransactionAsync();
        var proof = await data.PasswordResetProofs.SingleOrDefaultAsync(item =>
            item.UserId == request.UserId && item.TokenHash == HashToken(request.Token));
        if (proof is null || proof.UsedAtUtc is not null || proof.ExpiresAtUtc <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "Invalid or expired password reset link." });

        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || !await users.IsEmailConfirmedAsync(user))
            return Results.BadRequest(new { message = "Invalid or expired password reset link." });

        var separator = request.Token.IndexOf('.');
        if (separator < 1 || separator == request.Token.Length - 1)
            return Results.BadRequest(new { message = "Invalid or expired password reset link." });
        var result = await users.ResetPasswordAsync(user, request.Token[(separator + 1)..], request.NewPassword);
        if (!result.Succeeded)
        {
            await transaction.RollbackAsync();
            if (result.Errors.Any(error => error.Code == "InvalidToken"))
                return Results.BadRequest(new { message = "Invalid or expired password reset link." });
            return Results.BadRequest(new
            {
                message = string.Join(" ", result.Errors.Select(error => error.Description)),
            });
        }

        proof.UsedAtUtc = DateTime.UtcNow;
        await data.SaveChangesAsync();
        await transaction.CommitAsync();
        return Results.Ok(new { message = "Password reset. Sign in with your new password." });
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request, HttpContext context, UserManager<JanusUser> users,
        SignInManager<JanusUser> signIn)
    {
        if (string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword))
            return Results.BadRequest(new { message = "Current and new passwords are required." });

        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();

        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            if (result.Errors.Any(error => error.Code == "PasswordMismatch"))
                return Results.BadRequest(new { message = "Current password is incorrect." });
            return Results.BadRequest(new
            {
                message = string.Join(" ", result.Errors.Select(error => error.Description)),
            });
        }

        // Changing the security stamp revokes other Identity cookies. Refresh only this cookie.
        await signIn.RefreshSignInAsync(user);
        return Results.Ok(new { message = "Password changed." });
    }

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string PortalUrl(IConfiguration configuration, string query) =>
        $"{(configuration["Janus:PortalBaseUrl"] ?? "http://localhost:5173").TrimEnd('/')}/portal.html{query}";

    private sealed record RequestPasswordResetRequest(string Email);
    private sealed record ResetPasswordRequest(string UserId, string Token, string NewPassword);
    private sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
}
