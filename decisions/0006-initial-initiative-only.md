# 0006: Use initiative only for the initial order

- Date: 2026-09-25
- Status: Accepted
- Related specs: [005: Manual encounter ordering](../specs/005-manual-encounter-order.md), [004: Initiative and turn sequence](../specs/004-initiative-and-turn-sequence.md)
- Supersedes: None; refines [0005](0005-manual-encounter-turns.md)
- Superseded by: None

## Context

The project owner clarified that initiative numbers only build the original encounter order. Users must be able to see all participants and change their order through drag and drop while the encounter is active.

## Decision

After starting an encounter, use the current participant list order for turn advancement. Allow users to reorder PCs, NPCs, and mobs by dragging and dropping. Do not re-sort the running sequence by initiative, including at cycle boundaries.

The manual Next control and wraparound counter from decision 0005 remain in effect. Behavior when entries cross the active position is proposed in spec 005 and is not settled by this decision.

[Decision 0010](0010-mob-initiative-and-finished-ui.md) subsequently introduced initiative-based mob insertion, but was superseded by [decision 0011](0011-prepare-and-fight.md): initiative controls Prepare order, and the dungeon master chooses new mob positions during Fight.

## Alternatives considered

- Re-sorting by initiative on each cycle: would discard the user's chosen order.
- Requiring initiative edits to move a participant: inconsistent with direct manual ordering and initiative having no role after the initial sort.

## Consequences

The application must maintain an explicit participant order independently of initiative values and track the active participant through reorder operations. Cycle and Next behavior must account for changes to that order.
