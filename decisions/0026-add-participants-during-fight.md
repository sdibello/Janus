# 0026: Add participants before the active participant during Fight

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; refines [0022](0022-place-new-mobs-before-advancing.md)
- Superseded by: None

## Context

The project owner confirmed that the DM may add PCs, NPCs, and mobs at any time during Fight. PCs and NPCs are selected from the encounter's campaign; mobs remain local to the encounter. New entries should appear immediately before the active participant and can then be moved.

## Decision

Allow adding any participant category during Fight. Insert new participants immediately before the current active participant, preserve the active highlight and existing participants' relative order, then allow drag-and-drop reordering. No initiative is requested for additions during Fight. The new participant's individual Turn counter starts at zero; adding it does not change existing counters or Round.

## Alternatives considered

- Allow only mobs during Fight: conflicts with the owner's explicit allowance for PCs and NPCs.
- Add at the end by default: conflicts with the requested immediate-before-active placement.

## Consequences

PC/NPC selection remains scoped to the current encounter's campaign. Since the active highlight stays put, Next follows the list from its current participant after insertion or any subsequent reorder.
