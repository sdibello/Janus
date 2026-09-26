# 0046: Revoke access and allow new requests

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review clarified whether previously approved product access can be removed and whether the affected user can request access again.

## Decision

Administrators can revoke previously approved product access within their established scope: shared administrators across all products, and product administrators for their own product. A user whose access was revoked can submit a new request without administrator permission to request again. Restoring access requires approval.

## Alternatives considered

- Blocking new requests until an administrator permits them: not chosen.
- Deferring access revocation beyond the initial scope: not chosen.

## Consequences

The access workflow must support revocation as well as approval and rejection. Revoked access cannot authorize protected product operations, including through an existing login. A new request does not itself restore access. Product access revocation does not revoke access to other products.
