# 0049: Shared administrators appoint administrators

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review clarified who can assign the agreed shared and product administrator roles.

## Decision

Only shared administrators can appoint shared administrators or product administrators. Product administrators cannot appoint administrators, including for their own product.

## Alternatives considered

- Allowing product administrators to appoint administrators for their own product: not chosen.

## Consequences

Administrator assignment requires shared administrator authority, enforced at the server/API boundary. Product access approval remains separate from administrator appointment. How the first shared administrator is established remains an open setup question.
