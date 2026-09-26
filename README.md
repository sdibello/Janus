# Janus

Janus provides campaign and encounter management for dungeon masters, with shared identity and application access for future products.

## Project guide

- [AGENTS.md](AGENTS.md): shared guidance for AI coding assistants.
- [specs/](specs/README.md): requirements and acceptance criteria.
- [decisions/](decisions/README.md): durable records of project decisions and their reasons.
- [Outstanding questions](specs/OPEN-QUESTIONS.md): resume the requirements review here.
- [Implementation plan](specs/IMPLEMENTATION-PLAN.md): local architecture proposal, delivery sequence, and validation gates.
- [Requirements review](specs/REQUIREMENTS-REVIEW.md): corrected contradictions and remaining qualifications.

## Getting started

1. Describe the first feature using [the spec template](specs/TEMPLATE.md).
2. Record project and technology choices using [the decision template](decisions/TEMPLATE.md).
3. Add installation, development, and validation commands here when the implementation exists.

The frontend uses React with TypeScript; the backend API uses ASP.NET Core with C#. See [decision 0063](decisions/0063-react-typescript-and-aspnet-core.md). No application code or executable build tooling exists yet.

Janus will run locally during initial setup and validation, with cloud hosting planned for long-term operation. Local setup commands and the cloud provider remain undecided. See [decision 0061](decisions/0061-local-setup-then-cloud-hosting.md).

Use SQLite for initial local operation and revisit the database choice before cloud deployment. See [decision 0064](decisions/0064-sqlite-for-initial-local-use.md).

Cloud provider and database selection are deferred until the local application is working. See [decision 0068](decisions/0068-defer-cloud-selection-until-local-app-works.md).

Local operation must support Windows 11 and the latest stable Fedora release. Fedora is the primary test platform; record the concrete version during setup and validation. See [decision 0070](decisions/0070-latest-stable-fedora-target.md).

Entity Framework Core will handle database access and schema migrations; Vite will run and build the frontend. These tools are selected but not yet installed or configured. See [decision 0066](decisions/0066-entity-framework-core-and-vite.md).

Shared identity will use ASP.NET Core Identity and OpenIddict with OpenID Connect, hosted locally initially and in the cloud later. See [decision 0067](decisions/0067-self-hosted-identity-and-openiddict.md).

Local setup will capture verification and password-reset emails in a test inbox without sending real email. The inbox tool remains to be selected. See [decision 0071](decisions/0071-local-test-inbox-for-email.md).
