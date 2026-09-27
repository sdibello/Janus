using Janus.Identity.Persistence;
using Microsoft.AspNetCore.Identity;

namespace Janus.Identity;

public sealed class CommonPasswordValidator : IPasswordValidator<JanusUser>
{
    private static readonly HashSet<string> Blocked = new(StringComparer.OrdinalIgnoreCase)
    {
        "passwordpassword", "password123456", "123456789012345", "12345678901234567890",
        "qwertyuiopasdfgh", "iloveyouiloveyou", "letmeinletmein", "adminadminadmin",
        "correct horse battery staple", "thisisapassword", "changemechangeme",
    };

    public Task<IdentityResult> ValidateAsync(UserManager<JanusUser> manager, JanusUser user, string? password)
    {
        if (password is null) return Task.FromResult(IdentityResult.Failed(new IdentityError
        {
            Code = "PasswordRequired", Description = "A password is required.",
        }));

        var normalized = password.Trim().Normalize(System.Text.NormalizationForm.FormKC);
        if (Blocked.Contains(normalized)
            || (user.UserName is { Length: >= 4 } name
                && normalized.Contains(name, StringComparison.OrdinalIgnoreCase)))
        {
            return Task.FromResult(IdentityResult.Failed(new IdentityError
            {
                Code = "PasswordBlocked",
                Description = "Choose a less common password that does not include your username.",
            }));
        }

        return Task.FromResult(IdentityResult.Success);
    }
}
