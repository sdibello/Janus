# 0019: Advance active selection using the pre-reorder list

- Date: 2026-09-25
- Status: Superseded by [0080](0080-keep-active-on-reorder-and-show-drop-slot.md)
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: [0012](0012-active-participant-selection.md)
- Superseded by: None

## Context

The project owner replaced the earlier three-choice prompt with a deterministic rule: when participants are reordered, make the next participant in the original list active, not the next participant in the changed list. The owner also requested that the dungeon master can set any participant active.

## Decision

After any participant reorder, choose as active the participant that followed the previously active participant in the order immediately before the reorder. Compute that successor before applying the new order. Wrap to the first participant when the previous active participant was last. Adding a participant alone leaves the active selection unchanged.

Provide a control for the dungeon master to set any participant active. Reordering or selecting an active participant does not rearrange any other item. [Decision 0020](0020-turn-counter-wrap-only.md) confirms that neither action changes the Turn counter; only Next wrapping last to first increments it.

## Alternatives considered

- Ask the dungeon master to choose among the moved participant, its old successor, or any participant after each reorder: the owner selected the pre-reorder successor rule instead.
- Compute the active participant from the changed list: explicitly contrary to the requested behavior.

## Consequences

Capture the active participant's successor before committing each reorder. Keep active identity and list order as separate state so the dungeon master can also select any participant directly. Same-name entries must be distinguished by identity.
