# 0064: SQLite for initial local use

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Janus will run locally on Windows and Fedora before moving to cloud hosting. The review offered PostgreSQL from the start or SQLite initially for simpler local setup.

## Decision

Use SQLite for initial local operation. Revisit the database choice before cloud deployment; no cloud database is selected yet.

## Alternatives considered

- PostgreSQL for both local and cloud operation from the start: not chosen; simpler initial local setup is preferred.

## Consequences

Local setup does not require a separate database server. A later database change may require schema and data migration work and validation against the selected provider. Data-access tooling remains undecided. This decision does not establish synchronization between local installations or add offline-use requirements.
