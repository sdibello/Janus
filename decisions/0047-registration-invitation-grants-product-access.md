# 0047: Registration invitation grants product access

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

New accounts require an invitation, while access to additional products uses a request and approval workflow. The review clarified whether an invited new user must separately request access to the product they were invited to.

## Decision

Accepting a valid registration invitation, completing registration, and verifying the email address grants access to the product identified by that invitation. No separate access request or approval is required for that product.

## Alternatives considered

- Creating only an account and requiring a separate product access request: not chosen.

## Consequences

Registration invitations must identify the product whose access they grant. The invitation does not grant access to other products; the existing request and approval workflow applies to additional product access. Email verification remains required. Who can issue invitations and their expiry and reuse rules remain to be defined.
