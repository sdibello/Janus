# 0068: Defer cloud selection until the local application works

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Janus will run locally first, with cloud hosting as the long-term target. The review asked whether to select the cloud provider and database now.

## Decision

Defer cloud provider and cloud database selection until the local application is working.

## Alternatives considered

- Selecting a provider and cloud database now: not chosen; initial work will focus on local operation.

## Consequences

Local implementation proceeds with the accepted stack and SQLite. Cloud hosting remains the long-term target. Before cloud deployment, revisit provider, database, deployment approach, and local-data migration requirements. These deferred choices do not block initial local implementation.
