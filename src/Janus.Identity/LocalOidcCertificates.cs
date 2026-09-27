using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace Janus.Identity;

internal static class LocalOidcCertificates
{
    public static X509Certificate2 LoadOrCreate(string keyDirectory, string purpose)
    {
        var path = Path.Combine(keyDirectory, $"oidc-{purpose}.pfx");
        if (!File.Exists(path))
        {
            using var key = RSA.Create(3072);
            var request = new CertificateRequest(
                $"CN=Janus local {purpose}", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            using var certificate = request.CreateSelfSigned(
                DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddYears(5));
            try
            {
                using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                output.Write(certificate.Export(X509ContentType.Pfx));
            }
            catch (IOException) when (File.Exists(path))
            {
                // A second local host created the same certificate first.
            }
            if (!OperatingSystem.IsWindows())
                File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }

        return X509CertificateLoader.LoadPkcs12FromFile(
            path, null, X509KeyStorageFlags.EphemeralKeySet);
    }
}
