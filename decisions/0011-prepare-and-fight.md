# 0011: Prepare and Fight phases

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: [0010](0010-mob-initiative-and-finished-ui.md)
- Superseded by: None

## Context

The project owner clarified that encounters have two operational phases: Prepare and Fight. Initiative is recorded during Prepare to establish the original order. During Fight, drag-and-drop changes are allowed and new monsters can be placed wherever the dungeon master chooses.

## Decision

Use Prepare to record initiative and establish the initial participant order. Use Fight for manual turn advancement, drag-and-drop ordering, and adding encounter-local mobs at a user-selected position without requiring initiative. Initiative does not determine insertion during Fight.

Carry forward the finished-encounter behavior from decision 0010: retain finished encounters for viewing with no modification controls in the UI, without requiring immutable storage or a separate correction facility. Finished is the state after Fight ends, not an additional operational phase.

## Alternatives considered

- Using initiative to insert mobs during Fight: replaced by explicit user placement, resolving ambiguity after manual reordering.
- Always appending new mobs: would not allow the requested choice of position.

## Consequences

Validation and controls depend on the phase. Initiative is needed before entering Fight but is not required for later mob additions. Insertion preserves the existing entries' relative order. [Decision 0012](0012-active-participant-selection.md) resolves active-highlight preservation on insertion and the prompt when moving the active participant. First-turn timing remains proposed in spec 004.
