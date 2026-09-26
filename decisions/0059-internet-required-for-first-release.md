# 0059: Internet required for the first release

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

The review clarified whether Janus must support offline use in the first release.

## Decision

The first release requires an internet connection. Offline operation is outside scope, including continuing an open encounter offline or opening previously saved encounters without internet.

## Alternatives considered

- Keeping an already-open encounter usable after connection loss: not required.
- Opening and running saved encounters offline: not required.

## Consequences

The first release does not require offline storage, offline editing, or synchronization of offline changes. The existing requirement to restore saved encounter progress still applies when connected. This decision does not select a hosting or deployment model.
