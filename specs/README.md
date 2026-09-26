# Specifications

Keep project and feature requirements here. Copy TEMPLATE.md to a descriptive filename such as 001-first-feature.md.

Write down the problem, scope, and observable acceptance criteria before substantial implementation. Keep open questions explicit and link related decision records. Update the spec when agreed requirements change.

Status values: Draft, Ready, In progress, Complete, Retired.

Continue the requirements review using [outstanding questions](OPEN-QUESTIONS.md), which consolidates unresolved choices and summarizes confirmed answers.

The [consistency review](REQUIREMENTS-REVIEW.md) records corrections and remaining qualifications. The [implementation plan](IMPLEMENTATION-PLAN.md) defines the next local development steps; its technical proposals are distinct from accepted product decisions.

## Release requirements

The first usable release includes all agreed features across specs 001 through 007: accounts and access administration, campaigns and characters, encounters, initiative and turn ordering, HP tracking, and the existing UI shared through an external screen-sharing tool. Previously deferred features remain outside scope, and unresolved proposals are not approved by this release decision. See decision [0060](../decisions/0060-all-agreed-features-in-first-release.md).

The first release targets desktop and laptop computers only. Tablet and phone support are outside the initial scope. See decision [0058](../decisions/0058-desktop-and-laptop-initial-support.md).

An internet connection is required. Offline operation, including continuing an open encounter or opening saved encounters without internet, is outside the first-release scope. Restoring saved encounter progress remains required when connected. See decision [0059](../decisions/0059-internet-required-for-first-release.md).

Acceptance: the included account, access-management, campaign, and encounter workflows must be usable on supported desktop and laptop environments with an internet connection. Select specific supported environments with the implementation and validate those workflows there; no application exists yet.

First-release acceptance must cover the agreed requirements in every listed spec; a smaller implemented subset does not complete the release scope.

Deployment must support local operation for initial setup and validation, with cloud hosting as the long-term target. Local operation does not require offline support. The cloud provider remains undecided. See decision [0061](../decisions/0061-local-setup-then-cloud-hosting.md).

Local setup and operation must work on Windows 11 and the latest stable Fedora release, with instructions and validation covering each platform. Fedora is the primary test platform; verify and record the concrete release during setup and validation. Windows-only validation is insufficient. See decisions [0069](../decisions/0069-windows-11-and-fedora-test-priority.md) and [0070](../decisions/0070-latest-stable-fedora-target.md).

Use React with TypeScript for the frontend and ASP.NET Core with C# for the backend API, as accepted in decision [0063](../decisions/0063-react-typescript-and-aspnet-core.md). Use SQLite for initial local operation and revisit the database before cloud deployment, as accepted in decision [0064](../decisions/0064-sqlite-for-initial-local-use.md). Use Entity Framework Core for database access and schema migrations and Vite for frontend development and builds, as accepted in decision [0066](../decisions/0066-entity-framework-core-and-vite.md). Shared identity uses locally hosted ASP.NET Core Identity and OpenIddict with OpenID Connect, moving to cloud hosting later, under decision [0067](../decisions/0067-self-hosted-identity-and-openiddict.md). Exact versions and the cloud database remain to be selected.

Manual transfer of the SQLite database between Windows and Fedora is sufficient during local setup. No built-in sharing, synchronization, or campaign transfer interface is required. Document the transfer procedure and validate that transferred data opens on both platforms with compatible application versions. See decision [0065](../decisions/0065-manual-local-database-transfer.md).

Defer cloud provider and cloud database selection until the local application is working. Revisit deployment and data migration before moving to the cloud; these choices do not block local implementation. See decision [0068](../decisions/0068-defer-cloud-selection-until-local-app-works.md).

| Spec | Status | Summary |
| --- | --- | --- |
| [001](001-shared-identity-and-access.md) | Draft | Account lifecycle and reusable identity and access across applications. |
| [002](002-campaigns-and-characters.md) | Draft | Create campaigns and maintain their PC and NPC lists. |
| [003](003-encounters-and-participants.md) | Draft | Create encounters with PCs, NPCs, and mobs saved within the encounter. |
| [004](004-initiative-and-turn-sequence.md) | Draft | Prepare initiative order, enter Fight, place new mobs, advance turns, and finish encounters. |
| [005](005-manual-encounter-order.md) | Draft | Reorder active participants by drag and drop; initiative sets only the original order. |
| [006](006-player-facing-display.md) | Draft | Show the existing dungeon master UI to players through external screen sharing. |
| [007](007-hit-point-tracking.md) | Draft | Optional current HP, damage subtraction, and persistent Unconscious status; other effects deferred. |
