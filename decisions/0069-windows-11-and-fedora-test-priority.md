# 0069: Windows 11 and Fedora test priority

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Local operation on Windows and Fedora is already required. The owner confirmed Windows 11 and identified Fedora as the key test platform, without specifying a Fedora release number.

## Decision

Support Windows 11 for local operation. Treat Fedora as the primary test platform while retaining Windows validation. Confirm the Fedora release before selecting compatible runtime and dependency versions.

## Alternatives considered

- Treating Windows as the primary test platform: does not match the owner's stated priority.
- Assuming a specific Fedora release: not justified by the answer.

## Consequences

Setup and application workflows must be validated on Fedora as well as Windows 11. Windows-only checks are insufficient to establish cross-platform readiness. Fedora release and exact dependency versions remain unresolved.
