# 0078: Local OpenID Connect product sessions

- Date: 2026-09-27
- Status: Accepted for local implementation
- Related specs: [Shared identity and access](../specs/001-shared-identity-and-access.md)
- Supersedes: None
- Superseded by: None

## Context

The campaign host needs to recognize the shared account without sharing the identity cookie or copying password handling. Product access can be revoked while a browser session is open, so a login-time grant check alone is insufficient.

## Decision

Use OpenID Connect authorization-code flow with required S256 PKCE for the local campaign client. Identity issues codes only to verified users with a current campaign grant and rechecks the grant and password security stamp at code exchange. Keep the campaign authentication ticket, including its access token, protected in a campaign-owned SQLite session row; its browser cookie contains only a session reference. The campaign host checks the current grant and password state through an identity bearer-token endpoint whenever it serves protected user context. The page makes one silent return-sign-in attempt when no campaign session exists.

Generate separate local signing and encryption certificates under the configured application data directory. Keep the HTTP transport exception limited to local Development operation; production needs HTTPS and managed certificates.

## Alternatives considered

Sharing the identity cookie would couple products to Identity internals. A self-contained browser ticket would carry tokens to the browser and make local session removal harder. A separate distributed session cache adds infrastructure before the local workflow needs it.

## Consequences

The identity host must be reachable for protected operations. Revoked grants and password-stamp changes take effect on the next check. The second product client, Remember me across products, full password-driven session renewal, and eventual cloud key management remain follow-up work.
