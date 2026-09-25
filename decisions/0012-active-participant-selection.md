# 0012: Choose the active participant when moving its entry

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves active-selection behavior left open by [0011](0011-prepare-and-fight.md)
- Superseded by: None

## Context

The project owner confirmed that adding to the encounter order does not change the highlighted participant. For moving the active participant, the owner selected a prompt offering three active-participant choices.

## Decision

Adding participants preserves the active highlight. Moving the active participant prompts the dungeon master to keep that participant active, activate its successor from before the move, or select another participant. Moving another entry leaves the active participant unchanged.

Counter behavior, cancellation, and the former-successor choice when moving the last entry have proposed defaults in spec 005 and are not settled by this decision.

## Alternatives considered

- Always keeping the moved participant active: does not provide the requested choice.
- Automatically activating its former successor: also removes the requested choice.

## Consequences

The application must remember the pre-move successor and distinguish same-name entries by identity. The active move must collect an explicit choice, and the resulting list must have exactly one highlighted participant.
