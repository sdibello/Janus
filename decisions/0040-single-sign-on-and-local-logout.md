# 0040: Single sign-on and application-local logout

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Separate products share accounts. The requirements review clarified whether an existing login carries across products and how broadly logout applies.

## Decision

- Opening another authorized product uses the existing login to sign the user in automatically, without requiring credentials again.
- Logout affects only the current product. Other products remain signed in.

## Alternatives considered

- Requiring a separate login for each product: not chosen.
- Logging out all products in the current browser: not chosen.

## Consequences

The identity integration must support single sign-on and application-local session invalidation. Shared login does not itself grant application access. Session expiry and password-change/reset revocation remain separate decisions. The implementation must reconcile local logout with shared sign-in; whether returning to a logged-out product requires an explicit sign-in action remains to be clarified.
