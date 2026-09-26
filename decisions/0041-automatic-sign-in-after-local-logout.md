# 0041: Automatic sign-in after local logout

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Decision [0040](0040-single-sign-on-and-local-logout.md) establishes shared sign-in and application-local logout. The review clarified what happens when a user returns to a product after logging out.

## Decision

Returning to a logged-out product signs the user in automatically if the shared login is still active and the user remains authorized for that product. No explicit Sign in action is required.

## Alternatives considered

- Remaining logged out until the user clicks Sign in: not chosen.

## Consequences

Local logout invalidates the product's existing session but does not end the shared login. A return can establish a new product session automatically; logout therefore does not keep the user signed out on return. An expired or otherwise invalid shared login cannot be used for automatic sign-in. Session duration remains undecided.
