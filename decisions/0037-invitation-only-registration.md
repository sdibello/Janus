# 0037: Invitation-only registration

- Status: Accepted
- Date: 2026-09-25
- Related spec: [001: Shared identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The business review clarified whether anyone can create an account or whether registration is restricted.

## Decision

New users need an invitation to create an account. Open self-registration is not supported.

## Consequences

The registration flow must validate an invitation. The process for issuing invitations and invitation expiry or reuse rules remain implementation/product details to settle before implementation.
