# 0045: Repeat access requests after rejection

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Product access requires administrator approval. The review clarified whether a rejected user can request access to the same product again.

## Decision

After an administrator rejects an access request, the user can submit another request for that product without administrator permission to request again. The new request still requires approval before access is granted.

## Alternatives considered

- Requiring administrator permission before another request: not chosen.
- Permanently preventing another request for that product: not chosen.

## Consequences

Rejection does not permanently block further requests. Rejected and pending requests do not grant access. Access revocation and registration invitation behavior remain separate open questions.
