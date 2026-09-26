# 0061: Local setup followed by cloud hosting

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

The owner plans to run Janus locally while getting it set up, with cloud hosting as the long-term destination.

## Decision

Support running Janus locally for initial setup and validation. Target cloud hosting for long-term operation. No cloud provider or technology stack is selected by this decision.

## Alternatives considered

- Starting directly in cloud hosting: deferred until the local setup is ready.
- A permanently self-managed server as the long-term target: not selected.

## Consequences

Implementation and setup documentation must support local operation and a later cloud deployment. Running locally does not introduce an offline-use requirement or remove the existing internet requirement. Local environment details, cloud provider, stack, identity implementation, and data migration approach remain to be determined.
