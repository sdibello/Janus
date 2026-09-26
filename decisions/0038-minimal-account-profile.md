# 0038: Minimal account profile

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The requirements review asked whether accounts need profile fields beyond the required username and email address.

## Decision

Username and email address are the only account profile fields needed for now. No additional profile fields are included in the initial scope.

## Alternatives considered

- An optional display name or other profile fields: deferred because they are not needed at this stage.

## Consequences

The account profile stays minimal. This does not change the password, stable internal user identifier, or verification requirements. Additional profile fields can be considered when a concrete need arises.
