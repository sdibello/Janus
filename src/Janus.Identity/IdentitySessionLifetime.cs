using Microsoft.AspNetCore.Authentication;

namespace Janus.Identity;

internal static class IdentitySessionLifetime
{
    public static readonly TimeSpan BrowserSession = TimeSpan.FromHours(8);
    public static readonly TimeSpan RememberedSession = TimeSpan.FromDays(30);

    public static AuthenticationProperties Create(bool rememberMe) => new()
    {
        IsPersistent = rememberMe,
        ExpiresUtc = DateTimeOffset.UtcNow.Add(rememberMe ? RememberedSession : BrowserSession),
    };
}
