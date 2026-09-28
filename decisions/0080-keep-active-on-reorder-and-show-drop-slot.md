# 0080: Keep the active participant on reorder and show the drop slot

- Date: 2026-09-28
- Status: Accepted
- Related spec: [005: Manual encounter ordering](../specs/005-manual-encounter-order.md)
- Supersedes: [0019: Advance active selection using the pre-reorder list](0019-active-after-reorder.md) and the reorder-active clause in [0079](0079-alpha-encounter-workflow.md)

## Context

The former drag feedback outlined an entire participant tile, leaving the insertion position unclear. Reordering also advanced the active highlight to the old active participant's successor, even though the dungeon master had not used Next or Skip.

## Decision

During Fight, show an arrow and line at the exact insertion slot while dragging: between two displayed tiles or after the final tile. The active participant remains the first displayed tile, so no slot is offered before it. Dropping saves the chosen order but preserves the active participant, Round, individual Turn counters, and current-Round completion. Keyboard Move up/down uses the same active-preserving reorder command. A canceled drag or unchanged order has no effect.

## Consequences

The reorder API updates participant positions without selecting a new active participant. The UI calculates an insertion slot from the drag position and previews that slot rather than outlining a tile. Next and Skip still advance normally from the preserved active participant through the newly saved order.
