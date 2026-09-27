# Local identity and access contract

Janus Identity owns shared accounts, passwords, invitations, product registration, administrator appointments, and product grants. A product owns its own campaign or other application data and stores the stable `userId` from Identity rather than copying credentials or treating usernames as keys.

## Current local API

The identity host exposes `GET /products` for the registered product catalog and `GET /account/me` for the signed-in user's ID, username, email, granted product IDs, product-administrator scopes, and shared-administrator flag. `GET /account/access/{productId}` returns 200 only when the current user has a grant for that product, 403 without a grant, 401 without a valid identity session, and 404 for an unknown product. It reads the grant table on each request, including after a revocation.

The shared portal uses `POST /products/{productId}/access-requests` and `GET /account/access-requests` for a user's requests. Administrators use the `/admin/` endpoints to register products, appoint administrators, issue invitations, review requests, list current grants, and revoke grants. Shared administrators can manage any product; product administrators are checked against their appointed product on every management request. Request approval and rejection require a pending request. A pending or rejected request is never a grant.

The identity host now also serves OpenID Connect authorization-code flow with required S256 PKCE. The registered `janus-campaigns` client uses the callback `http://localhost:5199/signin-oidc`. An authorized, verified user receives an authorization code only while the campaign grant exists; code exchange checks the current grant and password security stamp again. Development signing and encryption certificates live under the local Janus application data directory, outside the repository.

The campaign host signs in through this protocol and keeps its protected authentication ticket in the `CampaignSessions` SQLite table; the browser cookie contains only a session reference. On page entry, `/auth/try-sign-in` makes a one-time silent attempt to restore a product session from the shared login. `GET /auth/me` asks the identity host to validate the access token and current grant on every call. The identity endpoint `GET /connect/access/{productId}` requires a bearer access token issued for that exact product and returns the stable user ID, username, and email on success. It returns 401 for no valid token and 403 for a missing grant, a different product, or a changed password security stamp. Product data must use the returned stable user ID and enforce this check on every protected operation.

## Next integration step

Add a second minimal product client to prove isolation and shared sign-in without copying identity code. Campaign data endpoints must enforce the access check and campaign ownership before they are exposed. Complete Remember me behavior and the accepted password-change/reset session lifecycle in [spec 001](../specs/001-shared-identity-and-access.md), including a verified current-session renewal path. The campaign cookie currently lasts for the browser session or eight hours, whichever comes first. Only the local Janus client has been exercised; this is not yet the complete cross-product contract.
