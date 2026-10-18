# Janus

Janus provides campaign and encounter management for dungeon masters, with shared identity and application access for future products.

## Project guide

- [AGENTS.md](AGENTS.md): shared guidance for AI coding assistants.
- [specs/](specs/README.md): requirements and acceptance criteria.
- [decisions/](decisions/README.md): durable records of project decisions and their reasons.
- [Outstanding questions](specs/OPEN-QUESTIONS.md): resume the requirements review here.
- [Implementation plan](specs/IMPLEMENTATION-PLAN.md): local architecture proposal, delivery sequence, and validation gates.
- [Requirements review](specs/REQUIREMENTS-REVIEW.md): corrected contradictions and remaining qualifications.
- [Local development](docs/LOCAL-DEVELOPMENT.md): setup, migrations, startup, and build commands.
- [Database backups](docs/BACKUPS.md): nightly SQLite/data-directory backups to AWS S3 or Azure Blob Storage, retention, and restoration.
- [Alpha 0.1 task list](docs/ALPHA-IMPLEMENTATION-TASKS.md): requested UI changes, decision points, and implementation order.
- [Identity integration](docs/IDENTITY-INTEGRATION.md): current local access API and the remaining cross-product session boundary.

## Run locally

Install the .NET 10 SDK (see `global.json`) and Node.js 24 with npm 11. From the repository root, run this one-time setup in a terminal:

```powershell
dotnet tool restore
dotnet restore Janus.slnx
dotnet ef database update --project src/Janus.Identity --startup-project src/Janus.Identity --context IdentityDataContext
dotnet ef database update --project src/Janus.Campaigns --startup-project src/Janus.Campaigns --context CampaignDataContext
npm ci --prefix web
dotnet run --project src/Janus.Identity -- --setup-admin
```

The final command prompts for the first administrator's username, email, and password. Run it only once. It creates the account but does not start the server. Then open three terminals at the repository root and keep each command running:

```powershell
dotnet run --project src/Janus.Identity --launch-profile http
```

```powershell
dotnet run --project src/Janus.Campaigns --launch-profile http
```

```powershell
npm run dev --prefix web
```

Open the [access portal](http://localhost:5173/portal.html), verify the first account using its message in the **Local test inbox**, and sign in. Open the [campaign app](http://localhost:5173/) to create campaigns and encounters. On later runs, start only the three terminals. Stop each with Ctrl+C. The SQLite database and local keys are stored outside the repository in your operating system's local application data directory under `Janus`; see [local development](docs/LOCAL-DEVELOPMENT.md) for a custom data directory, account invitations, published hosting, and checks.

After pulling a version with new database migrations, rerun the relevant `dotnet ef database update` command before starting Janus. For the alpha encounter update, rerun the `CampaignDataContext` command above. It upgrades the existing local database without recreating your account or campaigns. If `Janus__DataDirectory` is set, use the same value for the migration command and the running hosts.

## Run with Docker (local development)

Install Docker with the Compose plugin and use Linux containers. Run these commands from the repository root. Docker builds the frontend and both .NET hosts; you do not need Node.js or the .NET SDK on the host for this path.

```sh
docker compose build
docker compose run --rm --no-deps identity --migrate
docker compose run --rm --no-deps campaigns --migrate
docker compose run --rm --no-deps identity --setup-admin
docker compose up -d
```

The setup command prompts for the first administrator's username, email, and password in an interactive terminal. Start the hosts before opening the verification link. Docker's port forwarding does not satisfy the local inbox endpoint's loopback check, so retrieve the newest verification message for the email address you entered with:

```sh
docker compose run --rm --no-deps identity --show-local-message admin@example.com
```

Replace `admin@example.com` with your email address. Open the printed link in your browser, select **Verify email**, then sign in at the [access portal](http://localhost:5186/portal.html). Open the [campaign app](http://localhost:5199/) to create campaigns and encounters. Use the same command to read a new user's verification or password-reset message. Keep these links private.

The two containers share the `janus-data` named volume for SQLite, local signing certificates, and data-protection keys. `docker compose down` stops and removes the containers but keeps that volume; `docker compose up -d` starts them again. After pulling changes with database migrations, stop Janus, rebuild, and run both migration commands above in order before restarting it:

```sh
docker compose down
docker compose build
docker compose run --rm --no-deps identity --migrate
docker compose run --rm --no-deps campaigns --migrate
docker compose up -d
```

The Compose configuration binds ports 5186 and 5199 to your machine's loopback interface. `Janus__IdentityBaseUrl` is the browser-facing identity address; `Janus__IdentityInternalBaseUrl` lets Campaigns contact Identity on the Compose network. This configuration uses Development-only local certificates and a test inbox. Production hosting still needs certificate and email-delivery configuration, plus a deployment database decision. See [decision 0090](decisions/0090-local-docker-compose.md).

The access portal supports invitation-based registration, email verification, sign-in, password management, and product access administration. The campaign page uses a separate shared-identity session and supports campaigns, PC/NPC lists, collapsed encounter preparation, a Fight-start initiative prompt, active-first Fight tiles, and encounter-specific HP. New requirements and decisions use the [spec template](specs/TEMPLATE.md) and [decision template](decisions/TEMPLATE.md).

The frontend uses React with TypeScript; the backend API uses ASP.NET Core with C#. See [decision 0063](decisions/0063-react-typescript-and-aspnet-core.md).

Janus will run locally during initial setup and validation, with cloud hosting planned for long-term operation. The cloud provider remains undecided. See [decision 0061](decisions/0061-local-setup-then-cloud-hosting.md).

Use SQLite for initial local operation and revisit the database choice before cloud deployment. See [decision 0064](decisions/0064-sqlite-for-initial-local-use.md).

Cloud provider and database selection are deferred until the local application is working. See [decision 0068](decisions/0068-defer-cloud-selection-until-local-app-works.md).

Local operation must support Windows 11 and the latest stable Fedora release. Fedora is the primary test platform; record the concrete version during setup and validation. See [decision 0070](decisions/0070-latest-stable-fedora-target.md).

Entity Framework Core handles database access and schema migrations; Vite runs and builds the frontend. See [decision 0066](decisions/0066-entity-framework-core-and-vite.md).

Shared identity will use ASP.NET Core Identity and OpenIddict with OpenID Connect, hosted locally initially and in the cloud later. See [decision 0067](decisions/0067-self-hosted-identity-and-openiddict.md).

Local setup captures verification and password-reset messages in the SQLite-backed test inbox without sending real email. See [decision 0074](decisions/0074-sqlite-local-test-inbox.md).
