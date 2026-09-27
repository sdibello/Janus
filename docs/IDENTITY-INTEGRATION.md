# Local identity and access contract

Janus Identity owns shared accounts, passwords, invitations, product registration, administrator appointments, and product grants. A product owns its own campaign or other application data and stores the stable `userId` from Identity rather than copying credentials or treating usernames as keys.

## Current local API

The identity host exposes `GET /products` for the registered product catalog and `GET /account/me` for the signed-in user's ID, username, email, granted product IDs, product-administrator scopes, and shared-administrator flag. `GET /account/access/{productId}` returns 200 only when the current user has a grant for that product, 403 without a grant, 401 without a valid identity session, and 404 for an unknown product. It reads the grant table on each request, including after a revocation.

The shared portal uses `POST /products/{productId}/access-requests` and `GET /account/access-requests` for a user's requests. Administrators use the `/admin/` endpoints to register products, appoint administrators, issue invitations, review requests, list current grants, and revoke grants. Shared administrators can manage any product; product administrators are checked against their appointed product on every management request. Request approval and rejection require a pending request. A pending or rejected request is never a grant.

The current browser session is an ASP.NET Core Identity cookie for the identity host. These APIs are a local proof of the access rules, **not yet a cross-product authentication contract**: another application must not copy the cookie, trust a client-supplied user ID, or treat the portal's access badge as authorization. The campaign host is not yet integrated or protected by these grants.

## Next integration step

Add OpenID Connect authorization-code flow with PKCE and a separate server-side session for each product. The product backend should identify its registered client and authenticated user, require the current product grant on protected requests, handle 401 and 403 separately, and keep its own profile/onboarding data keyed by the stable Identity user ID. Password changes and resets must revoke or renew product sessions according to [spec 001](../specs/001-shared-identity-and-access.md), and a second minimal client must prove isolation and single sign-on before this contract is considered complete.
