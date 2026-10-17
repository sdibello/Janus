namespace Janus.Campaigns;

// Keep the OIDC issuer and browser URLs public while sending server-side requests
// to the Identity service address on the container network.
internal sealed class IdentityBackchannelHandler(Uri publicBaseUrl, Uri internalBaseUrl)
    : DelegatingHandler(new HttpClientHandler())
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri is { } uri
            && Uri.Compare(uri, publicBaseUrl, UriComponents.SchemeAndServer,
                UriFormat.Unescaped, StringComparison.OrdinalIgnoreCase) == 0)
        {
            request.Headers.Host = uri.Authority;
            request.RequestUri = new UriBuilder(uri)
            {
                Scheme = internalBaseUrl.Scheme,
                Host = internalBaseUrl.Host,
                Port = internalBaseUrl.Port,
            }.Uri;
        }

        return base.SendAsync(request, cancellationToken);
    }
}
