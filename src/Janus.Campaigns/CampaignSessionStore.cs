using System.Security.Cryptography;
using Janus.Campaigns.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.WebUtilities;

namespace Janus.Campaigns;

internal sealed class CampaignSessionStore(
    IServiceScopeFactory scopeFactory, IDataProtectionProvider protectionProvider) : ITicketStore
{
    private readonly IDataProtector _protector = protectionProvider.CreateProtector("CampaignSessionStore.v1");

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var id = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        await using var scope = scopeFactory.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<CampaignDataContext>();
        data.Sessions.Add(new CampaignSession
        {
            Id = id,
            ProtectedTicket = Protect(ticket),
            ExpiresAtUtc = ticket.Properties.ExpiresUtc ?? DateTimeOffset.UtcNow.AddHours(8),
        });
        await data.SaveChangesAsync();
        return id;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<CampaignDataContext>();
        var session = await data.Sessions.FindAsync(key);
        if (session is null) return;
        session.ProtectedTicket = Protect(ticket);
        session.ExpiresAtUtc = ticket.Properties.ExpiresUtc ?? DateTimeOffset.UtcNow.AddHours(8);
        await data.SaveChangesAsync();
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<CampaignDataContext>();
        var session = await data.Sessions.FindAsync(key);
        if (session is null || session.ExpiresAtUtc <= DateTimeOffset.UtcNow) return null;
        try { return TicketSerializer.Default.Deserialize(_protector.Unprotect(session.ProtectedTicket)); }
        catch (CryptographicException) { return null; }
    }

    public async Task RemoveAsync(string key)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var data = scope.ServiceProvider.GetRequiredService<CampaignDataContext>();
        var session = await data.Sessions.FindAsync(key);
        if (session is null) return;
        data.Sessions.Remove(session);
        await data.SaveChangesAsync();
    }

    private byte[] Protect(AuthenticationTicket ticket) =>
        _protector.Protect(TicketSerializer.Default.Serialize(ticket));
}
