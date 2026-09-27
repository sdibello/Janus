using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication;

namespace Janus.Campaigns;

internal sealed class CampaignAccessService(IHttpClientFactory clients)
{
    public const string CookieScheme = "Janus.Campaign";

    public async Task<CampaignAccessResult> CheckAsync(
        HttpContext context, CancellationToken cancellationToken)
    {
        var session = await context.AuthenticateAsync(CookieScheme);
        if (!session.Succeeded || session.Properties?.GetTokenValue("access_token") is not { } token)
            return new(StatusCodes.Status401Unauthorized, null);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/connect/access/janus-campaigns");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        try
        {
            using var response = await clients.CreateClient("identity-access")
                .SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.Forbidden)
                return new(StatusCodes.Status403Forbidden, null);
            if (response.StatusCode == HttpStatusCode.Unauthorized)
                return new(StatusCodes.Status401Unauthorized, null);
            if (!response.IsSuccessStatusCode)
                return new(StatusCodes.Status503ServiceUnavailable, null);
            var profile = await response.Content.ReadFromJsonAsync<CampaignUserProfile>(cancellationToken);
            return profile is null
                ? new(StatusCodes.Status503ServiceUnavailable, null)
                : new(StatusCodes.Status200OK, profile);
        }
        catch (HttpRequestException) { return new(StatusCodes.Status503ServiceUnavailable, null); }
    }
}

internal sealed record CampaignUserProfile(string UserId, string UserName, string Email, string ProductId);
internal sealed record CampaignAccessResult(int StatusCode, CampaignUserProfile? Profile)
{
    public IResult Failure() => Results.StatusCode(StatusCode);
}
