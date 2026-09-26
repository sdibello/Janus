# 0039: Separate products sharing accounts

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The requirements review clarified what future applications mean for the shared identity capability.

## Decision

Future applications are separate products, each with its own purpose, sharing accounts through the same identity system.

## Alternatives considered

- Treating future applications as additional features within Janus: not the intended product boundary.

## Consequences

The shared identity integration must support separate products. This decision does not select a deployment architecture or integration protocol, or settle single sign-on, logout scope, or access grants; these remain open questions.
