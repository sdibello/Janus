# 0053: Invitations expire after 24 hours

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Registration invitation links are reusable. The review selected a fixed validity period of 24 hours.

## Decision

Registration invitation links expire 24 hours after issuance. Reuse does not restart or extend this period. Expired links cannot authorize a new registration.

## Alternatives considered

- No automatic expiry, with administrator disabling: not chosen.
- An expiry date selected by the issuing administrator: not chosen.

## Consequences

The system must track issuance and expiry and validate expiry during registration. Multiple people can use the link within its validity period. Invitation expiry does not revoke product access already granted through that invitation.
