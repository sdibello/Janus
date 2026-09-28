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

The access portal supports invitation-based registration, email verification, sign-in, password management, and product access administration. The campaign page uses a separate shared-identity session and supports campaigns, PC/NPC lists, encounter preparation, Fight controls, and encounter-specific HP. New requirements and decisions use the [spec template](specs/TEMPLATE.md) and [decision template](decisions/TEMPLATE.md).

The frontend uses React with TypeScript; the backend API uses ASP.NET Core with C#. See [decision 0063](decisions/0063-react-typescript-and-aspnet-core.md).

Janus will run locally during initial setup and validation, with cloud hosting planned for long-term operation. The cloud provider remains undecided. See [decision 0061](decisions/0061-local-setup-then-cloud-hosting.md).

Use SQLite for initial local operation and revisit the database choice before cloud deployment. See [decision 0064](decisions/0064-sqlite-for-initial-local-use.md).

Cloud provider and database selection are deferred until the local application is working. See [decision 0068](decisions/0068-defer-cloud-selection-until-local-app-works.md).

Local operation must support Windows 11 and the latest stable Fedora release. Fedora is the primary test platform; record the concrete version during setup and validation. See [decision 0070](decisions/0070-latest-stable-fedora-target.md).

Entity Framework Core handles database access and schema migrations; Vite runs and builds the frontend. See [decision 0066](decisions/0066-entity-framework-core-and-vite.md).

Shared identity will use ASP.NET Core Identity and OpenIddict with OpenID Connect, hosted locally initially and in the cloud later. See [decision 0067](decisions/0067-self-hosted-identity-and-openiddict.md).

Local setup captures verification and password-reset messages in the SQLite-backed test inbox without sending real email. See [decision 0074](decisions/0074-sqlite-local-test-inbox.md).
