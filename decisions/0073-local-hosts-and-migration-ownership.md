# 0073: Local hosts and migration ownership

- Date: 2026-09-27
- Status: Accepted
- Related plan: [Local implementation plan](../specs/IMPLEMENTATION-PLAN.md)

## Context

The local implementation needs shared identity for future products and a campaign service while keeping initial setup simple with SQLite. The plan proposed two hosts and one database; the migration ownership needed a concrete choice.

## Decision

- Use separate ASP.NET Core identity and campaign hosts, plus a domain library that has no HTTP or EF Core dependency.
- Use one local SQLite database with an EF Core context owned by each host. Each context has its own migration history table, and setup applies identity migrations before campaign migrations.
- Use one Vite React workspace with separate campaign and access portal pages.
- Store the SQLite database and persistent local data-protection keys in the operating system's local application data directory by default. Allow a configured data directory for isolated development and validation.

## Consequences

Identity and campaign tables can evolve without either host owning the other's EF model. Both hosts still contend for one SQLite file, so database operations should stay short and migrations must run sequentially. The shared file supports the agreed manual local transfer; keys and future session handling need separate transfer and recovery guidance before that workflow is considered complete. The current implementation contains schemas and service health checks; it does not yet implement authentication or campaign operations.
