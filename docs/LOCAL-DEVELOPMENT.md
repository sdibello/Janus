# Local development

The local application has two ASP.NET Core hosts, two React entry pages, and EF Core migrations in one SQLite file. The portal handles invitation-based accounts; the campaign page now signs in through the shared identity host. Campaign and encounter data workflows are still under development.

## Requirements

- .NET SDK 10.0.202 or a compatible later .NET 10 feature band (see `global.json`).
- Node.js 24 and npm 11. The Windows setup was checked with Node 24.14.1 and npm 11.11.0.
- Windows 11 or the latest stable Fedora. The commands below were validated on Windows; Fedora validation remains to be done.

## First setup

From the repository root, run these in order:

```sh
dotnet tool restore
dotnet restore Janus.slnx
dotnet ef database update --project src/Janus.Identity --startup-project src/Janus.Identity --context IdentityDataContext
dotnet ef database update --project src/Janus.Campaigns --startup-project src/Janus.Campaigns --context CampaignDataContext
npm ci --prefix web
```

The migration commands create `janus.db` in the operating system's local application data directory under `Janus`. Identity data and campaign data share the file but have separate migration histories; apply the identity migration first. The identity host stores data-protection keys and local OpenID Connect signing/encryption certificates in `keys/`. The campaign host stores its data-protection keys in `campaign-keys/` and protected session tickets in SQLite. Nothing from that directory belongs in source control. Keep its private keys accessible only to the local user.

For an isolated test database, set `Janus__DataDirectory` to a disposable directory before running both migration commands and both hosts. The same value must be used by both hosts. The repository's `.local/` path is ignored and was used for the Windows smoke test.

## Create the first account

After applying the identity migration, run the setup command from the repository root in an interactive terminal:

```sh
dotnet run --project src/Janus.Identity -- --setup-admin
```

Enter a username, email address, and password when prompted. The password is entered without echo. Use at least 15 characters; usernames may contain letters, digits, hyphens, periods, and underscores. The command creates the first shared administrator and can only run while no shared administrator exists. It does not start the web server or create a public setup page.

Then start the identity host and Vite as shown below. Open <http://localhost:5173/portal.html>, find the verification message in the **Local test inbox**, open its link, and select **Verify email**. Sign in with the username or email address and password. To create another account, sign in as the administrator, select **Create invitation**, and share the resulting link. An invitation grants access to Janus campaigns after the new user's email is verified, works for multiple people, and expires after 24 hours.

Signed-in users can change their password from the portal after entering the current password. From the sign-in form, **Forgot password?** accepts the account's verified email address and places a reset link in the local test inbox. The response is the same when the email address is unknown. Each reset link can be used once within one hour. A reset signs out existing identity sessions; a password change keeps the current identity session and signs out other identity sessions.

Open <http://localhost:5173/> to establish a separate campaign session through OpenID Connect. The page first tries a one-time silent sign-in; if the shared identity cookie is valid and the user has a campaign grant, no password prompt or button click is needed. Otherwise select **Sign in**. **Sign out of campaigns** removes only the campaign session; leaving and returning to the page can restore it from the still-valid shared login. The current campaign session is a browser-session cookie with an eight-hour maximum. Remember me across products remains future work.

## Manage product access

The portal lists registered products and each signed-in user's current grants and access requests. A verified account can request a product it does not have. A pending request grants no access. Shared administrators can register products, appoint shared or product administrators, issue invitations, review requests, and revoke grants across products. Product administrators see those controls only for their appointed products. Rejected requests and revoked grants can be requested again.

Registering a product here creates identity and access metadata, not a running application or OpenID Connect client. The local `janus-campaigns` client is registered by the identity host on startup after migrations. The campaign host checks its session against the current product grant on each `/auth/me` request. Future campaign data endpoints must enforce the same check and campaign ownership before they are exposed.

The inbox is stored in the local SQLite database and is exposed only in Development from the loopback interface. Keep Vite bound to localhost as configured; do not expose or tunnel its development proxy, which can reach the inbox. Verification links and invitations are secrets: do not commit the database, copy links into logs, or use this inbox as a production email service. A real email delivery provider is still required before cloud deployment.

## Run the application

Open three terminals in the repository root:

```sh
dotnet run --project src/Janus.Identity --launch-profile http
```

```sh
dotnet run --project src/Janus.Campaigns --launch-profile http
```

```sh
npm run dev --prefix web
```

Open <http://localhost:5173> for the campaign page or <http://localhost:5173/portal.html> for the access portal page. Vite proxies API requests to the identity host on port 5186 and campaign host on port 5199; campaign sign-in navigates directly to port 5199 for the registered callback. Each health endpoint returns success only when its EF Core migrations are applied. If changing local ports, keep `Janus:CampaignClientRedirectUri`, `Janus:IdentityBaseUrl`, `Janus:WebBaseUrl`, `VITE_IDENTITY_ORIGIN`, and `VITE_CAMPAIGN_ORIGIN` consistent.

## Build checks

```sh
dotnet build Janus.slnx
npm run build --prefix web
npm run lint --prefix web
```

The web build writes both pages to `web/dist/`. Static hosting from the ASP.NET Core hosts, full password compromise screening, a second product client, and campaign workflows remain implementation work. OpenID Connect campaign sign-in and local logout have been smoke-tested on Windows; Remember me across products and the full password-driven session lifecycle are not yet complete.

After setup and email verification, run `tests/oidc-smoke.ps1` against a disposable database to check campaign sign-in, local logout, and password-free return. Its optional `-ExerciseRevocation` switch revokes the signed-in user's campaign grant, so use it only on disposable data with a shared administrator account:

```powershell
./tests/oidc-smoke.ps1 -Identifier admin -Password (Read-Host 'Admin password' -AsSecureString)
```

For a repeatable account API smoke test, create a fresh isolated database, apply the identity migration, and run `--setup-admin` as above. Start the identity host with the same `Janus__DataDirectory`, then run `tests/account-smoke.ps1` with the administrator identifier, email, and password. The script requires PowerShell 7 and consumes the new database's local verification message. For example, PowerShell can prompt for the password without putting it on the command line:

```powershell
./tests/account-smoke.ps1 -AdminIdentifier admin -AdminEmail admin@example.test -AdminPassword (Read-Host 'Admin password' -AsSecureString)
```

After verifying an account, `tests/password-smoke.ps1` exercises change and recovery against an isolated database. It changes the test account's password, so run it only on disposable data. The optional `-DatabasePath` argument checks expiry by updating a reset proof in that test database and requires Python 3:

```powershell
./tests/password-smoke.ps1 -Email admin@example.test -Password (Read-Host 'Current password' -AsSecureString) -DatabasePath .local/test-identity/janus.db
```

`tests/access-smoke.ps1` exercises a second registered product, product-scoped administrators, request approval/rejection, revocation, and direct-API denials. It creates test accounts and changes grants, so use the same kind of disposable database. The administrator must already be verified:

```powershell
./tests/access-smoke.ps1 -AdminIdentifier admin -AdminEmail admin@example.test -AdminPassword (Read-Host 'Admin password' -AsSecureString) -BaseUri http://localhost:5186
```

For a combined run, execute account, access, then password smoke in that order on one disposable database. Restart the identity host after the account script, which intentionally exhausts the in-memory login rate limiter. The password script changes the administrator's password, so run it last.
