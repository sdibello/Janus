# 0062: Windows and Fedora local support

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

The owner requires local operation on the current Windows machine and a Fedora laptop before moving to cloud hosting.

## Decision

Local setup and operation must support both Windows and Fedora Linux.

## Alternatives considered

- Windows-only local setup: insufficient because the Fedora laptop must also run Janus.

## Consequences

Setup instructions and implementation validation must cover both platforms. Specific operating-system versions remain to be confirmed. React and a C# backend are the owner's preferred technologies, with alternatives welcome; the final stack remains an open decision.
