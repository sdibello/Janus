# 0051: Shared and product administrators issue invitations

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Registration invitations grant access to the invited product after registration and email verification. The review clarified who can issue them.

## Decision

Shared administrators can issue registration invitations for any product. Product administrators can issue registration invitations only for their own product.

## Alternatives considered

- Restricting invitations to shared administrators only: not chosen.

## Consequences

Invitation issuance must enforce the administrator's product scope at the server/API boundary. The ability to invite users does not include authority to appoint administrators. Invitation expiry and reuse rules remain open.
