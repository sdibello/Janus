# 0013: Preserve encounters when Janus reopens

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None
- Superseded by: None

## Context

The project owner confirmed that an encounter already started must be maintained when Janus is reopened, in response to the question about restoring order, active participant, and Turn counter.

## Decision

Persist encounter progress and restore the saved phase, participants, initiative values, current order, active highlight, and Turn counter when the dungeon master returns. Closing, refreshing, or logging out does not end or reset the encounter. Preserve completed changes through the normal workflow without requiring a separate save-before-exit step.

## Alternatives considered

- Keeping Fight state only in the current browser session: would lose the requested continuity.
- Rebuilding the sequence from initiative on reopen: would discard manual ordering and current progress.

## Consequences

Save related state consistently and restore it after any required login. Unconfirmed prompt behavior is proposed separately in spec 004; offline support, cross-device use, and concurrent editing are not established by this decision.
