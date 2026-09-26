# 0067: Self-hosted ASP.NET Core Identity and OpenIddict

- Date: 2026-09-26
- Status: Accepted
- Related specs: [001: Shared identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Janus needs shared accounts and single sign-on across separate products, initially running locally and later in the cloud. The review proposed an identity implementation aligned with the selected .NET stack.

## Decision

Use ASP.NET Core Identity for accounts and passwords and OpenIddict for OpenID Connect sign-in across products. Host this identity capability locally initially and move it to the cloud with Janus later.

## Alternatives considered

- An externally managed identity service: not selected; the owner chose the locally hosted approach.

## Consequences

Janus owns identity configuration and operation. Invitation, approval, application-access, and session-management workflows must be implemented to meet the accepted requirements; choosing these libraries does not supply those workflows automatically. Exact versions, service layout, email delivery, key management, and security configuration remain implementation-planning work. The cloud provider remains undecided.
