# 0043: Shared and product administrators

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Product access requires a user request and administrator approval. The review clarified the scope of approval authority.

## Decision

Support both administrator levels: shared administrators manage access approvals across all products, and product administrators manage access approvals for their own product.

## Alternatives considered

- Shared administrators only: does not provide product-level administration.
- Product administrators only: does not provide shared oversight across products.

## Consequences

Access approval checks must recognize shared authority and product-scoped authority. A product administrator's role alone cannot authorize approval for another product. This decision concerns access administration and does not grant management of another DM's campaigns. Administrator assignment and initial setup remain to be defined, along with application roles and the request lifecycle.
