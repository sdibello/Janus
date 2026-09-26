# 0054: Password changes and session revocation

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review confirmed the proposed session behavior for forgotten-password resets and authenticated password changes.

## Decision

- A successful forgotten-password reset signs out all existing sessions across products and devices.
- A successful password change while signed in renews the current session, keeping the user signed in there, and signs out all other sessions across products and devices.

## Alternatives considered

- Keeping other existing sessions signed in after credential changes: not chosen.

## Consequences

Session revocation must cover shared identity sessions and product sessions so an old shared login cannot restore a revoked session automatically. Password-driven revocation is distinct from ordinary application-local logout. Session duration and reset-link expiry remain open.
