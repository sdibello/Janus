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

## Getting started

Follow [local development](docs/LOCAL-DEVELOPMENT.md) to create the SQLite database and start the two backend hosts and Vite. The current pages show service readiness; account, campaign, and encounter workflows are still under development. New requirements and decisions use the [spec template](specs/TEMPLATE.md) and [decision template](decisions/TEMPLATE.md).

The frontend uses React with TypeScript; the backend API uses ASP.NET Core with C#. See [decision 0063](decisions/0063-react-typescript-and-aspnet-core.md).

Janus will run locally during initial setup and validation, with cloud hosting planned for long-term operation. Local setup commands and the cloud provider remain undecided. See [decision 0061](decisions/0061-local-setup-then-cloud-hosting.md).

Use SQLite for initial local operation and revisit the database choice before cloud deployment. See [decision 0064](decisions/0064-sqlite-for-initial-local-use.md).

Cloud provider and database selection are deferred until the local application is working. See [decision 0068](decisions/0068-defer-cloud-selection-until-local-app-works.md).

Local operation must support Windows 11 and the latest stable Fedora release. Fedora is the primary test platform; record the concrete version during setup and validation. See [decision 0070](decisions/0070-latest-stable-fedora-target.md).

Entity Framework Core handles database access and schema migrations; Vite runs and builds the frontend. See [decision 0066](decisions/0066-entity-framework-core-and-vite.md).

Shared identity will use ASP.NET Core Identity and OpenIddict with OpenID Connect, hosted locally initially and in the cloud later. See [decision 0067](decisions/0067-self-hosted-identity-and-openiddict.md).

Local setup will capture verification and password-reset emails in a test inbox without sending real email. The inbox tool remains to be selected. See [decision 0071](decisions/0071-local-test-inbox-for-email.md).
