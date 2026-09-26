# 0050: First shared administrator designated during setup

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Only shared administrators can appoint administrators, so the first shared administrator needs an initial setup path.

## Decision

Designate the first shared administrator account during deployment or setup. Do not provide a public setup page for this purpose. Subsequent administrator appointments follow the shared-administrator-only rule in decision [0049](0049-shared-administrators-appoint-administrators.md).

## Alternatives considered

- A one-time setup page protected by a setup code: not chosen.
- Deferring the setup approach until technology selection: not chosen; the specific implementation mechanism remains a technical choice.

## Consequences

Deployment instructions must document how to establish the initial shared administrator. The implementation mechanism will be selected with the technology stack. This decision does not select a particular account or store any credentials in project documentation.
