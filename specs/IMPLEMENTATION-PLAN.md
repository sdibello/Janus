# Local implementation plan

- Date: 2026-09-26
- Status: In progress. Local identity, the first campaign OpenID Connect session, and owner-scoped campaign/character workflows have been smoke-tested on Windows; Fedora, encounters, and full cross-product integration remain.
- Product scope: all accepted requirements in specs 001–007 and decisions through 0078.

## Starting point

Build locally for Windows 11 and the latest stable Fedora, with Fedora the primary validation platform. Use React/TypeScript, Vite, ASP.NET Core/C#, EF Core, SQLite, ASP.NET Core Identity, and OpenIddict. Capture email locally. Cloud selection remains deferred. The review findings and outstanding qualifications are in [REQUIREMENTS-REVIEW.md](REQUIREMENTS-REVIEW.md).

The choices below are implementation proposals, not additional user-approved requirements. Record durable technical decisions as they are adopted and validated. Do not mark the feature specs Ready solely because a scaffold builds.

## Proposed local architecture

Use two small ASP.NET Core hosts in one repository: an identity host for accounts, OpenIddict, and the shared access portal; and a campaign host for the campaign API and product session. Keep encounter domain logic independent of HTTP, EF Core, and React. Avoid message brokers, distributed caches, or additional infrastructure without a demonstrated need.

Use one React workspace with separate portal and campaign entry points. Vite supplies development assets; published builds are served by their respective hosts. Browser requests use the appropriate host's same-origin API. Keep product session cookies distinct from the identity cookie. Do not put long-lived credentials in browser storage.

The local implementation uses one SQLite database with separately owned identity and campaign EF Core contexts and separate migration history tables under [decision 0073](../decisions/0073-local-hosts-and-migration-ownership.md). Apply migrations sequentially, identity first. The two hosts must use short transactions and handle SQLite contention. This supports the agreed manual database transfer without adding synchronization. Do not assume the eventual cloud database will have identical migration behavior.

Use OpenID Connect authorization code flow with PKCE and server-side product sessions. Validate application grants on protected requests, not only at login. Persist session identifiers and revocation state so password resets and access revocation take effect without waiting for an old token to expire. Prove this behavior with a second minimal client before expanding the UI.

The local email capture is now a SQLite-backed inbox exposed by the Development identity host on loopback, under [decision 0074](../decisions/0074-sqlite-local-test-inbox.md). Store data-protection and signing keys outside the repository in an application data directory. Use persistent local development keys rather than regenerating them on every restart. A database move must not assume machine-specific keys move with it; require a documented sign-in/recovery procedure on the destination.

## Runtime and tooling baseline

The Windows foundation uses .NET SDK 10.0.202, EF Core 10.0.12, OpenIddict 7.7.1, Node.js 24.14.1, npm 11.11.0, React 19.3.0, TypeScript 6.0.3, and Vite 8.3.1. Project package versions and the npm lockfile are pinned. Validate the same setup on Fedora before treating Step 1 as complete, and pin test dependencies when tests are introduced.

The official .NET Fedora documentation currently lists Fedora 44 and 43 with .NET 10 support. This is compatibility evidence, not a claim that either platform has been tested here or that the owner's laptop version was inspected. Recheck the stable Fedora release at setup time.

Sources checked on 2026-09-26: [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [.NET on Fedora](https://learn.microsoft.com/en-us/dotnet/core/install/linux-fedora), [Node release schedule](https://nodejs.org/en/about/previous-releases), [Mailpit binaries](https://mailpit.axllent.org/docs/install/), [OpenIddict server integration](https://documentation.openiddict.com/guides/getting-started/creating-your-own-server-instance).

## Delivery sequence and completion checks

| Step | Deliverable | Completion evidence |
| --- | --- | --- |
| 1. Reproducible foundation | Solution, frontend workspace, pinned versions, ignored local data/keys, configuration templates, migrations, local test inbox, documented startup | Both hosts and frontend start on Windows and Fedora; production asset build works; clean checkout can create a database; record actual versions and commands |
| 2. Identity proof | Setup-only administrator bootstrap, reusable invitations, verification, username/email login, recovery, password rules, portal requests and administrator scopes | Negative authorization tests; invitation/reset expiry and reuse tests; real flows through captured email; no sensitive values in logs |
| 3. Cross-product sessions | Two minimal clients, shared login, local logout, return login, Remember me, global password-driven revocation | Cross-client/session tests prove agreed behavior; resolve browser-restoration qualification before claiming browser-close acceptance |
| 4. Campaigns and preparation | Owner-scoped campaigns, PC/NPC lists, encounter membership, named mobs, initiative and tie ordering | Duplicate-name and duplicate-participant cases; referenced-character removal blocked; cross-campaign/direct-request isolation; restart preserves Prepare |
| 5. Encounter engine | Fight transition, Next, Skip, reorder, set-active, insertion, ending, atomic persistence | Table-driven domain tests for empty/single/multiple participants, pre-reorder successor, no-op reorder, Skip wrap without Round increment, and reload after every command |
| 6. HP and presentation | Exact HP arithmetic, status labels/colors, keyboard ordering, finished view, external screen sharing | Fractional boundaries, missing vs zero, negative HP, Heal/Damage, status/highlight coexistence; finished UI has no edit controls |
| 7. Local release validation | Full workflow and database-transfer instructions, Fedora-first manual validation, Windows parity | Transfer a consistent database between compatible builds, sign in again, verify campaigns and encounters; run all accepted feature checks; document limitations |

Each step adds only the tests needed for its behavior. Backend integration tests must exercise the actual SQLite provider, including authorization and migrations. Browser tests cover login redirects, keyboard controls, and a representative complete encounter rather than mirroring every domain test.

## Data and command design

Use stable identifiers for users, applications, campaigns, characters, encounters, and participants. Do not use names as keys. Enforce one campaign-character entry per encounter with a database constraint; mobs remain independent rows. Keep HP, initiative, counters, and order on encounter participation, with the encounter owning phase, Round, and active participant.

Mutations return the saved authoritative state. Save each encounter command transactionally, including order, highlight, and counters. Use an encounter revision to reject stale writes from another tab instead of silently overwriting newer progress. Do not implement an event history: a revision is concurrency metadata only.

The accepted initiative and HP requirements have no application-defined range. Do not silently map them to fixed-width integers, JavaScript Number, SQLite REAL, or C# decimal. Prototype arbitrary-length integer initiative and exact finite decimal HP carried as validated strings across JSON and persisted as canonical text. Perform arithmetic and sorting on the server with exact representations. Document resource limits separately from game-value limits and review any unavoidable constraint before adoption.

## Remaining technical configuration

- Choose exact versions and test dependencies after checking restore/build compatibility; update T01d with evidence.
- Validate the proposed host/database arrangement and key lifecycle; then record the durable architecture choice and close T01e1.
- Expand the current small local common-password list into a maintained common/expected/compromised-password blocklist source without transmitting plaintext passwords or logging them. The present list is only an interim safeguard and does not fulfill R10a completely.
- Specify configurable rate limits for login, recovery, verification, and invitations; select password hashing parameters with the chosen Identity version and measured performance. No periodic password expiration.
- Define non-Remember-me session timeout, email-verification expiry, username/email normalization and collision handling, and which authenticated user actions renew remembered sessions. Background polling must not silently keep an idle user logged in.
- Maintain accepted 30-day remembered inactivity expiry, one-hour reset expiry, and 24-hour invitation expiry. Do not substitute library defaults for these decisions.

## Next executable task

Continue Step 4 with encounter creation, campaign PC/NPC selection, encounter-local mobs, and a persisted Prepare phase. Campaign and character APIs now enforce current product grants and creating-DM ownership; `tests/campaign-smoke.ps1` passed duplicate-name, list-maintenance, and two-user isolation checks on Windows. `tests/oidc-smoke.ps1` passed sign-in, local logout, return sign-in, and immediate grant revocation. Manual disposable-data checks showed password change invalidating the old product session while preserving the current identity session and allowing silent product renewal; password reset invalidated both product and identity sessions. Step 3 still needs a second minimal product client, automated password-session checks, and Remember me semantics. Extend the interim password blocklist before claiming R10a. Step 1 still needs Fedora validation and static serving of published frontend assets. Resolve the browser-close qualification before Step 3 is finalized. No cloud deployment is needed for this work.
