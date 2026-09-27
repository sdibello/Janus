# 0077: Product access registry and administrator scopes

- Date: 2026-09-27
- Status: Accepted for the local identity proof
- Related decisions: [0042](0042-request-and-approve-application-access.md), [0043](0043-shared-and-product-administrators.md), [0046](0046-revoke-access-and-allow-new-requests.md), [0048](0048-shared-access-request-portal.md), [0049](0049-shared-administrators-appoint-administrators.md)

## Context

The shared portal needs to manage access for more than one product without treating an identity cookie or an administrator role as a product grant. Requests must not authorize product use before approval, and revocation must take effect for an already signed-in account.

## Decision

Keep a shared product registry, per-user product grants, and separate per-product administrator appointments in the identity database. Only shared administrators register products or appoint shared/product administrators. Shared administrators manage every product; product administrators manage only products for which they were appointed. The same scope check governs invitations, request review, grant listing, and revocation at the API boundary.

Store access requests with Pending, Approved, or Rejected status. A filtered unique index permits only one pending request per user and product; a rejected request or a revoked grant does not prevent a new request. Approval changes a pending request and creates a grant in one transaction. An atomic conditional update prevents another reviewer from resolving the same request again. Product administrators cannot approve their own request. The grant table is checked on each identity access-check request, so revocation is visible without waiting for cookie renewal.

## Consequences

Administrator authority and product access are distinct: revoking a product grant does not silently remove an administrator appointment. Product administrators may continue managing access through the shared portal but cannot approve their own new request. Registering a product here creates identity access metadata; OpenID Connect client registration, product sessions, and enforcement inside the campaign host remain separate implementation work. The portal and API use stable product and user IDs rather than names as keys.
