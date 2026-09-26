# 0056: Remember me lasts 30 days since last activity

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Remember me allows login to persist after closing and reopening the browser. The review selected its duration and renewal behavior.

## Decision

Remembered login remains valid for 30 days since the user's last activity. User activity while the login is valid renews the period to another 30 days. After 30 days without activity, the user must log in again.

## Alternatives considered

- Seven days from login: not chosen.
- Thirty days from login without activity-based renewal: not chosen.

## Consequences

Remembered sessions require activity-based expiry and renewal. Continued activity can extend the login beyond 30 days from its original creation. Activity after expiry cannot renew an expired login without authentication. Existing password-driven revocation rules continue to apply. The technical mechanism for tracking activity will be selected with the identity implementation.
