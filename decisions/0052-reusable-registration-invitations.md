# 0052: Reusable registration invitations

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review clarified whether registration invitations are restricted to one recipient or can be shared with multiple people.

## Decision

Registration invitation links are reusable: multiple people can register using the same valid link. Invitations are not tied to a specific recipient email address, and successful registration does not consume the link.

## Alternatives considered

- Single-use invitations tied to a specific email address: not chosen.
- Single-use invitations usable by any recipient: not chosen.

## Consequences

A shared link can admit multiple users to its designated product. Each registrant must still complete registration and email verification. Invitation validity must not be determined by whether it has already been used. Expiry remains to be decided.
