# 0042: Request and approve application access

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The requirements review clarified how users obtain access when a separate product becomes available.

## Decision

Users request access to a product, and an administrator approves it. Existing accounts do not automatically receive access to new products. A pending request does not grant access.

## Alternatives considered

- Automatically granting every existing account access: not chosen.
- Administrator grants without a user request as the normal access workflow: not chosen.

## Consequences

The application access workflow must support requests and administrator approval, with access enforced per product. Who administers approvals and what roles are needed remain open. The administration interface and request lifecycle details remain to be defined; this decision does not require a full administration suite. Invitation-only account registration remains a separate requirement.
