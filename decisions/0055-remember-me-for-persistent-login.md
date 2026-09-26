# 0055: Remember me for persistent login

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review clarified whether login should persist after closing and reopening the browser.

## Decision

Login persists after closing and reopening the browser only when the user selects Remember me. Without that selection, reopening the browser requires login again. The duration of remembered login remains to be decided.

## Alternatives considered

- Always persisting login for a fixed period: not chosen.
- Always requiring login after closing the browser: not chosen.
- Leaving persistence behavior to the identity implementation's defaults: not chosen.

## Consequences

The sign-in flow must offer Remember me. Shared identity and product session behavior must honor the choice together so shared sign-in does not bypass it. Existing password-driven session revocation rules still apply to remembered sessions.
