# 0066: Entity Framework Core and Vite

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Janus uses React with TypeScript, an ASP.NET Core C# backend, and SQLite initially. The review proposed database and frontend tooling for that stack.

## Decision

Use Entity Framework Core for database access and schema migrations, initially with its SQLite provider. Use Vite to run and build the React/TypeScript frontend.

## Alternatives considered

- Handwritten database access and schema migration infrastructure: not selected; EF Core supplies these capabilities for the chosen backend.
- Other frontend build tooling: no alternative was requested; Vite fits the selected React/TypeScript frontend.

## Consequences

Implementation will include these dependencies and document real setup and validation commands. Exact versions remain to be selected. A later database-provider change still requires provider-specific migration and validation work; EF Core does not make data migration automatic. No code or executable tooling is introduced by this decision.
