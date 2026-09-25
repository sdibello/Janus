# 0010: Mob insertion initiative and finished encounter UI

- Date: 2026-09-25
- Status: Superseded
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; refines [0006](0006-initial-initiative-only.md) and [0009](0009-campaign-encounters-and-history.md)
- Superseded by: [0011: Prepare and Fight phases](0011-prepare-and-fight.md), which replaces Fight mob placement and carries forward the finished-UI decision.

## Context

The project owner specified that adding an encounter-local mob should allow initiative entry to control its initial order. Finished encounters do not need to be read-only at the data level, but the UI should not facilitate modification.

## Decision

Use entered initiative for a new mob's initial placement, including when added during play. Once placed, manual order governs its turns. The insertion rule after existing participants have been reordered remains to be resolved.

Provide finished encounters for viewing without UI modification controls. Do not require immutable records or implement a separate correction facility from this request. Existing authorization and stopped-sequence rules remain applicable.

## Alternatives considered

- Always appending mobs to the end: does not meet the requested initiative-based placement.
- Offering an editor for finished encounters: outside the desired UI flow.
- Requiring immutable encounter storage: stronger than the requested viewing-only UI behavior.

## Consequences

Retain the initiative information needed by the agreed insertion rule. Clarify insertion into a manually reordered list before implementation. Separate UI capabilities from storage mutability without weakening access control.
