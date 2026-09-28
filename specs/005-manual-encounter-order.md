# 005: Manual encounter ordering

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0006: Use initiative only for the initial order](../decisions/0006-initial-initiative-only.md)
- Depends on: [004: Initiative and turn sequence](004-initiative-and-turn-sequence.md)
- Active-participant decision: [0019](../decisions/0019-active-after-reorder.md)

## Problem and intended outcome

During Fight, users need to see all PCs, NPCs, and mobs and rearrange their turn order by dragging and dropping entries. Initiative establishes the original order during Prepare. During Fight, new participants are inserted immediately before the active participant and can then be reordered; all participants follow the current list order.

## Scope

Included: displaying the full participant list, dragging entries to new positions during an active encounter, and using the resulting order for Next and subsequent cycles.

Adding PCs, NPCs, and mobs while running is covered by specs 003 and 004. New entries appear immediately before the active participant, preserve the active highlight, and can be dragged elsewhere. Participants cannot be removed during Fight. Spec 004 requires restoring saved order, active participant, Round, and individual Turn counters when Janus reopens. Undo remains outside this requirement.

## Requirements

- R1: An active encounter displays all of its PCs, NPCs, and individual mobs in the current turn order, with the active participant highlighted. Long lists may scroll, but participants must remain accessible.
- R2: An authorized user can drag any participant entry to a different position, including across PC, NPC, and mob categories. Dropping commits the new order and preserves the relative order of all other entries.
- R3: Initiative constructs the order during Prepare only. Display recorded initiative values throughout Prepare and Fight. During Fight, Next, wraparound, manual reordering, and adding a participant must not sort by initiative. New participants can be inserted without initiative entry; show no initiative value unless one was entered. Recorded values remain informational and do not control Fight order.
- R4: Reordering changes only the encounter's sequence. It does not change participant identity, category, initiative values, campaign records, or another encounter's order. Same-name mobs remain individually addressable.
- R5: Adding a participant leaves the current participant highlighted. After any reorder, set the active participant to the participant that followed the previously active participant in the order immediately before the reorder. Compute this successor from the pre-reorder list, then apply the changed list; do not calculate from the changed list. If the active participant was last, its successor is the first participant in the pre-reorder list. For a one-participant list, that participant remains active.
- R13: During Fight, newly added PCs, NPCs, and mobs are inserted immediately before the active participant. Adding an entry alone does not change the active highlight. The new entry can then be reordered like any other participant.
- R11: The dungeon master can explicitly set any participant as active using a control available during Fight. Exactly one participant is active. Selecting a participant does not reorder the list or change Round or individual Turn counters.
- R12: Round increments only when the dungeon master clicks Next while the last participant is active, wrapping the sequence to the first. Every Next click also increments the individual Turn counter of the participant whose turn was active. Drag-and-drop reordering, inserting participants, and manually selecting an active participant do not change either counter.
- R6: Next always advances to the participant immediately after the active participant in the current order. If the active participant is last, Next returns to the first entry and increments Round once. Do not track whether each participant has acted during the cycle or add special advancement behavior after reordering; the DM can select any participant active when an exception is needed.
- R8: The new order remains in effect for subsequent cycles until another reorder. A canceled drag or a drop in the original position leaves the sequence, active participant, and both counter types unchanged.
- R9: Provide a keyboard-accessible way to move entries with the same behavior as drag and drop, and keep the moved entry identifiable after a move.
- R10: Reordering requires permission to maintain the encounter, enforced on direct requests as well as in the UI. Reorder requests against an ended encounter do not change its stopped sequence.

## Acceptance criteria

- [ ] The active encounter shows every PC, NPC, and mob in one ordered sequence, with exactly one participant active.
- [ ] Given initial order A (18), B (12), C (5), dragging C between A and B produces A, C, B despite C's lower initiative.
- [ ] Given A, B, C with A active, reordering sets B (A's pre-reorder successor) active and leaves both counters unchanged.
- [ ] The next cycle still follows A, C, B without re-sorting by initiative.
- [ ] Initiative values remain displayed after reordering and do not change the manually selected order.
- [ ] Given A, B, C with B active, moving B to the end produces A, C, B while C, B's successor in the pre-move list, becomes active.
- [ ] Given A, B, C with A active, moving C before A produces C, A, B while B, A's successor in the pre-move list, becomes active. Successor selection uses the original list, not the changed list.
- [ ] Given A, B, C with C active, moving A to the end produces B, C, A while A, C's successor in the pre-move list, becomes active.
- [ ] After any reorder, Next advances to the participant immediately following the current active participant in the resulting current list.
- [ ] Given a single participant A, reordering/no-op behavior leaves A active.
- [ ] The dungeon master can manually set any participant, including an unconscious participant, as active. The selected entry becomes the only active entry while Round and all individual Turn counters remain unchanged.
- [ ] Adding a mob immediately before the active participant leaves that participant highlighted; a subsequent reorder follows the pre-reorder successor rule.
- [ ] Moving a non-active participant selects the old active participant's pre-reorder successor, without a prompt, and leaves counters unchanged.
- [ ] Manually selecting any participant and inserting a mob immediately before the active participant leave both counter types unchanged.
- [ ] Round increments by exactly one only when Next wraps from the last participant to the first; the active participant individual Turn counter increments on every Next click.
- [ ] Drag-and-drop reordering, whether moving the active or another participant, never resets or changes either counter type.
- [ ] Two mobs with the same name can be reordered independently without losing, duplicating, or changing either participant.
- [ ] Canceling a drag or dropping in the same position has no effect on order, active participant, or counter.
- [ ] Reordering and the active-participant choice work through keyboard controls as well as drag and drop.
- [ ] Single-participant behavior remains as defined in spec 004: Next increments that participant individual Turn count and Round and keeps that participant active.
- [ ] Unauthorized or ended-encounter reorder requests do not change the sequence.
- [ ] Reordering leaves campaign character information and other encounters unchanged.

## Validation

When implementation exists, exercise the examples above with PCs, NPCs, and same-name mobs. Test moving both the active participant and other participants across its position, moves to the first and last positions, canceled moves, and multiple wraparounds. Verify that initiative never overrides the manually chosen order. Check keyboard operation, access enforcement, and encounter isolation.

The Fight UI supports drag-and-drop and keyboard Move up/down controls. Windows API smoke checks cover changed and unchanged order, pre-reorder active successor, and persistence; browser interaction checks remain.

## Open questions

None from the completed review. Decision 0025 confirms initial and final counters; spec 004 requires consistent restoration of completed changes.
