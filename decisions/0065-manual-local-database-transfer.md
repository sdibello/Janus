# 0065: Manual local database transfer

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Janus must run locally on Windows and Fedora. The owner can manually move the SQLite database between machines during initial setup.

## Decision

Manual transfer of the SQLite database is sufficient for moving local data between Windows and Fedora. No application-level sharing, synchronization, or campaign transfer interface is required for this phase.

## Alternatives considered

- Built-in campaign transfer or live data sharing: unnecessary for initial local use.

## Consequences

Setup documentation must describe a consistent database transfer procedure, and implementation validation must check transferred data can be opened on the other supported platform with a compatible application version. This does not require merging independently edited databases or preserving active login sessions across machines. Identity configuration and any machine-specific dependencies must be accounted for when documenting the procedure.
