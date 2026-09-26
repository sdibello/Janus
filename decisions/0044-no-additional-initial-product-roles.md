# 0044: No additional initial product roles

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The review asked whether the initial campaign product needs additional roles or custom permissions beyond approved DMs and the agreed shared and product administrators.

## Decision

No additional roles or custom permissions are needed for the initial campaign product. Approved users act as DMs and manage their own campaigns under the existing ownership rules. Shared and product administrator roles remain as agreed for access administration. Players do not require accounts for the current screen-sharing workflow.

## Alternatives considered

- Additional application roles or custom permissions: not needed in the initial scope.

## Consequences

The initial permission model stays limited to product access, access administration, and campaign ownership. Future products can define their own permissions when their requirements are known. Administrator assignment and access-request lifecycle questions remain open.
