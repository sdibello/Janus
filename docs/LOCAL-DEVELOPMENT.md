# Local development

The local application has two ASP.NET Core hosts, two React entry pages, and EF Core migrations in one SQLite file. The portal handles invitation-based accounts; the campaign page signs in through the shared identity host and supports campaign, character, and encounter workflows. Vite serves the pages while developing; published hosts can serve the built pages themselves.

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

Open <http://localhost:5173/> to establish a separate campaign session through OpenID Connect. The page first tries a one-time silent sign-in; if the shared identity cookie is valid and the user has a campaign grant, no password prompt or button click is needed. Otherwise select **Sign in**. Once signed in, create campaigns and add, reclassify, or remove their PCs and NPCs. Within a campaign, create an encounter, add its PCs/NPCs and individual mobs, enter or edit whole-number initiative, and move tied entries up or down. Starting HP is optional for every participant. Once every participant has initiative, choose **Begin Fight**. During Fight use Next, Skip, drag-and-drop or Move up/down, Set active, add participants, and End encounter. Use **Save HP** to set or clear current HP; Damage subtracts its entered amount, and Heal adds its entered amount. Both accept signed decimal amounts and preserve exact values. HP below zero displays Unconscious until it reaches -10, then alive adjacent. Finished encounters remain available to view. Changes save immediately. **Sign out of campaigns** removes only the campaign session; leaving and returning to the page can restore it from the still-valid shared login. The campaign session is a browser-session cookie with an eight-hour maximum. The shared identity login is also a browser-session cookie unless **Remember me** is selected; that choice lasts 30 days from the last user interaction in either page.

## Manage product access

The portal lists registered products and each signed-in user's current grants and access requests. A verified account can request a product it does not have. A pending request grants no access. Shared administrators can register products, appoint shared or product administrators, issue invitations, review requests, and revoke grants across products. Product administrators see those controls only for their appointed products. Rejected requests and revoked grants can be requested again.

Registering a product here creates identity and access metadata, not a running application or OpenID Connect client. The local `janus-campaigns` client and Development-only `janus-session-proof` client are registered by the identity host on startup after migrations. The campaign host checks its session against the current product grant on each campaign or `/auth/me` request. Campaign, character, and encounter endpoints enforce creating-DM ownership.

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

The web build writes both pages to `web/dist/`. The ASP.NET Core publish commands copy each page and shared assets into its host. Full password compromise screening, Fedora validation, and browser interaction checks remain implementation work. OpenID Connect campaign sign-in, campaign/encounter/HP APIs, shared sign-in across two products, Remember me cookie renewal, and the identity password lifecycle have been smoke-tested on Windows. A browser-close check and automated cross-product password revocation check remain.

## Run published pages without Vite

Build the frontend first, then publish each host from the repository root:

```powershell
npm run build --prefix web
dotnet publish src/Janus.Identity/Janus.Identity.csproj -o .local/publish/identity
dotnet publish src/Janus.Campaigns/Janus.Campaigns.csproj -o .local/publish/campaigns
```

Use the same absolute data directory for both hosts. In an Identity terminal, run from `.local/publish/identity`:

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ASPNETCORE_URLS='http://localhost:5186'
$env:Janus__DataDirectory='D:\git\Janus\.local\your-data'
$env:Janus__PortalBaseUrl='http://localhost:5186'
dotnet Janus.Identity.dll
```

In a Campaigns terminal, run from `.local/publish/campaigns` with the same data directory:

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ASPNETCORE_URLS='http://localhost:5199'
$env:Janus__DataDirectory='D:\git\Janus\.local\your-data'
$env:Janus__WebBaseUrl='http://localhost:5199'
dotnet Janus.Campaigns.dll
```

Open <http://localhost:5186/portal.html> for accounts and <http://localhost:5199/> for campaigns. Replace the example data path with the absolute path used during setup. The compiled frontend defaults to these local origins; set `VITE_IDENTITY_ORIGIN` and `VITE_CAMPAIGN_ORIGIN` before building if ports change. Identity still requires Development for local certificates; production hosting needs a certificate and email-delivery setup.

For the Development-only second product test, start `dotnet run --project tests/Janus.SessionProof --launch-profile http` in a fourth terminal, using the same `Janus__DataDirectory`. It listens on port 5201 and stores proof-only data-protection keys in `proof-keys/`. On disposable data, run:

```powershell
./tests/session-smoke.ps1 -Identifier admin -Password (Read-Host 'Admin password' -AsSecureString)
./tests/cross-product-smoke.ps1 -AdminIdentifier admin -AdminPassword (Read-Host 'Admin password' -AsSecureString)
```

After setup and email verification, run `tests/oidc-smoke.ps1` against a disposable database to check campaign sign-in, local logout, and password-free return. Its optional `-ExerciseRevocation` switch revokes the signed-in user's campaign grant, so use it only on disposable data with a shared administrator account:

```powershell
./tests/oidc-smoke.ps1 -Identifier admin -Password (Read-Host 'Admin password' -AsSecureString)
```

On disposable data, `tests/campaign-smoke.ps1` checks campaign and character creation, duplicate names, PC/NPC reclassification, removal, Prepare and Fight sequencing, single-participant turns, persistence, two-campaign separation, and direct-request denial for a second invited user. Run it with a verified shared administrator who has a campaign grant and both hosts started:

```powershell
./tests/campaign-smoke.ps1 -AdminIdentifier admin -AdminPassword (Read-Host 'Admin password' -AsSecureString)
```

`tests/hp-smoke.ps1` exercises exact decimal HP, Damage, Heal, status boundaries, saved Fight/Finished values, and cross-user denial on the same kind of disposable database:

```powershell
./tests/hp-smoke.ps1 -AdminIdentifier admin -AdminPassword (Read-Host 'Admin password' -AsSecureString)
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
