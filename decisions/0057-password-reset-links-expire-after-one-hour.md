# 0057: Password-reset links expire after one hour

- Date: 2026-09-26
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review clarified the validity period for single-use password-reset links.

## Decision

Password-reset links expire one hour after issuance and remain single-use. At or after expiry, the link cannot authorize a password reset.

## Alternatives considered

- A 24-hour validity period: not chosen.
- Using the selected identity system's default expiry: not chosen.

## Consequences

The identity implementation must enforce a one-hour validity period. A user with an expired link must request a new one. Existing password-reset session revocation rules remain unchanged.
