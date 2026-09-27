# Local development

The local application has two ASP.NET Core hosts, two React entry pages, and EF Core migrations in one SQLite file. Invitation-based account creation, email verification, and sign-in now work through the portal. Campaign and encounter workflows are still under development.

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

The migration commands create `janus.db` in the operating system's local application data directory under `Janus`. Identity data and campaign data share the file but have separate migration histories; apply the identity migration first. The identity host also stores local data-protection keys in that directory's `keys` subfolder. Nothing from that directory belongs in source control.

For an isolated test database, set `Janus__DataDirectory` to a disposable directory before running both migration commands and both hosts. The same value must be used by both hosts. The repository's `.local/` path is ignored and was used for the Windows smoke test.

## Create the first account

After applying the identity migration, run the setup command from the repository root in an interactive terminal:

```sh
dotnet run --project src/Janus.Identity -- --setup-admin
```

Enter a username, email address, and password when prompted. The password is entered without echo. Use at least 15 characters; usernames may contain letters, digits, hyphens, periods, and underscores. The command creates the first shared administrator and can only run while no shared administrator exists. It does not start the web server or create a public setup page.

Then start the identity host and Vite as shown below. Open <http://localhost:5173/portal.html>, find the verification message in the **Local test inbox**, open its link, and select **Verify email**. Sign in with the username or email address and password. To create another account, sign in as the administrator, select **Create invitation**, and share the resulting link. An invitation grants access to Janus campaigns after the new user's email is verified, works for multiple people, and expires after 24 hours.

The inbox is stored in the local SQLite database and is exposed only in Development from the loopback interface. Verification links and invitations are secrets: do not commit the database, copy links into logs, or use this inbox as a production email service. A real email delivery provider is still required before cloud deployment.

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

Open <http://localhost:5173> for the campaign page or <http://localhost:5173/portal.html> for the access portal page. Vite proxies identity requests to the identity host on port 5186 and campaign health requests to the campaign host on port 5199. Each health endpoint returns success only when its EF Core migrations are applied.

## Build checks

```sh
dotnet build Janus.slnx
npm run build --prefix web
npm run lint --prefix web
```

The web build writes both pages to `web/dist/`. Static hosting from the ASP.NET Core hosts, password recovery/change, full password compromise screening, product administrator management, access requests, OpenID Connect sessions, and campaign workflows remain implementation work. Remember-me currently uses an Identity cookie, but the agreed cross-product session behavior has not yet been validated.

For a repeatable account API smoke test, create a fresh isolated database, apply the identity migration, and run `--setup-admin` as above. Start the identity host with the same `Janus__DataDirectory`, then run `tests/account-smoke.ps1` with the administrator identifier, email, and password. The script requires PowerShell 7 and consumes the new database's local verification message. For example, PowerShell can prompt for the password without putting it on the command line:

```powershell
./tests/account-smoke.ps1 -AdminIdentifier admin -AdminEmail admin@example.test -AdminPassword (Read-Host 'Admin password' -AsSecureString)
```
