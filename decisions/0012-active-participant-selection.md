# 0012: Choose the active participant when moving its entry

- Date: 2026-09-25
- Status: Superseded
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves active-selection behavior left open by [0011](0011-prepare-and-fight.md)
- Superseded by: [0019: Advance active selection using the pre-reorder list](0019-active-after-reorder.md)

## Context

The project owner confirmed that adding to the encounter order does not change the highlighted participant. For moving the active participant, the owner selected a prompt offering three active-participant choices.

## Decision

This three-choice prompt was superseded by decision 0019. Additions still preserve the active highlight; reordering now selects the previously active participant's successor from the pre-reorder list, and the dungeon master can select any participant active directly.

Counter behavior, cancellation, and the former-successor choice when moving the last entry have proposed defaults in spec 005 and are not settled by this decision.

## Alternatives considered

- Always keeping the moved participant active: does not provide the requested choice.
- Automatically activating its former successor: also removes the requested choice.

## Consequences

The application must capture the pre-reorder successor and distinguish same-name entries by identity. The resulting list must have exactly one highlighted participant.
