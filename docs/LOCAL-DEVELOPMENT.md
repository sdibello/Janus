# Local development

The current application is a runnable foundation. It has two ASP.NET Core hosts, two React entry pages, and EF Core migrations in one SQLite file. Account and campaign workflows are not implemented yet; the pages show service readiness.

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

Open <http://localhost:5173> for the campaign page or <http://localhost:5173/portal.html> for the access portal page. Vite proxies local health requests to the identity host on port 5186 and the campaign host on port 5199. Each health endpoint returns success only when its EF Core migrations are applied.

## Build checks

```sh
dotnet build Janus.slnx
npm run build --prefix web
npm run lint --prefix web
```

The web build writes both pages to `web/dist/`. Static hosting from the ASP.NET Core hosts and the identity and campaign features are the next implementation work. A test email inbox will be configured when verification and reset email flows are added.
