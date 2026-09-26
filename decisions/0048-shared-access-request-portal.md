# 0048: Shared access-request portal

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Users request product access and administrators review those requests. The review clarified where this workflow belongs.

## Decision

Provide one shared portal for users to request access across products and administrators to review requests. Administrators see only the access requests and controls they are authorized to manage: shared administrators across products, and product administrators for their own products.

## Alternatives considered

- Separate request and approval pages within each product: not chosen.
- Both a shared portal and per-product request and approval pages: not needed in the initial scope.

## Consequences

The access-request workflow has one shared interface. Users must be able to reach it before receiving access to a requested product. Administrator scope must be enforced at the server/API boundary as well as in the portal UI. This establishes the portal's purpose, not its technology or a broader administration suite.
