# 0036: Username, email, and verification

- Status: Accepted
- Date: 2026-09-25
- Related spec: [001: Shared identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The business review resolved the sign-in identifiers, password recovery channel, and email verification requirement.

## Decision

- Users can sign in with either their username or email address and password.
- Password reset uses the user's email address.
- Email verification is required before a user can access Janus.

## Consequences

Registration must collect a username and email address. Both identifiers must be unique under normalization, and the identity capability must track verification state and block access before email verification.
