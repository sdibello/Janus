# 005: Manual encounter ordering

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0006: Use initiative only for the initial order](../decisions/0006-initial-initiative-only.md), [0079: Alpha encounter workflow](../decisions/0079-alpha-encounter-workflow.md)
- Depends on: [004: Initiative and turn sequence](004-initiative-and-turn-sequence.md)
- Active-participant decision: [0019](../decisions/0019-active-after-reorder.md)

## Problem and intended outcome

During Fight, users need to see all PCs, NPCs, and mobs in one column of tiles and rearrange their turn order by dragging and dropping entries. Initiative establishes the original order at the Fight transition. Next and Skip move the active tile to the bottom and save that order. New participants are inserted immediately before the active participant in saved order and can then be reordered.

## Scope

Included: displaying the full participant list, dragging entries to new positions during an active encounter, and using the resulting order for Next and subsequent cycles.

Adding PCs, NPCs, and mobs while running is covered by specs 003 and 004. New entries appear immediately before the active participant, preserve the active highlight, and can be dragged elsewhere. Participants cannot be removed during Fight. Spec 004 requires restoring saved order, active participant, Round, and individual Turn counters when Janus reopens. Undo remains outside this requirement.

## Requirements

- R1: An active encounter displays all of its PCs, NPCs, and individual mobs in a single column of tiles, starting with the active participant and continuing cyclically in saved order. The active tile is highlighted and labeled. Long lists may scroll, but participants must remain accessible.
- R2: An authorized user can drag any participant entry to a different position, including across PC, NPC, and mob categories. Dropping commits the new order and preserves the relative order of all other entries.
- R3: Initiative constructs the order when the DM confirms Fight after the lightbox review. Display recorded initiative during Fight. Next, Skip, manual reordering, and adding a participant must not sort by initiative. New participants can be inserted without initiative entry; show no initiative value unless one was entered. Recorded values remain informational and do not control Fight order.
- R4: Reordering changes only the encounter's sequence. It does not change participant identity, category, initiative values, campaign records, or another encounter's order. Same-name mobs remain individually addressable.
- R5: Adding a participant leaves the current participant highlighted. After any reorder, set the active participant to the participant that followed the previously active participant in the order immediately before the reorder. Compute this successor from the pre-reorder list, then apply the changed list; do not calculate from the changed list. If the active participant was last, its successor is the first participant in the pre-reorder list. For a one-participant list, that participant remains active.
- R13: During Fight, newly added PCs, NPCs, and mobs are inserted immediately before the active participant. Adding an entry alone does not change the active highlight. The new entry can then be reordered like any other participant.
- R11: The dungeon master can explicitly set any participant as active using a control available during Fight. Exactly one participant is active. Selecting a participant does not reorder the list or change Round or individual Turn counters.
- R12: Round increments after every participant in the current Round has used Next or Skip once. Each Next increments only the active participant's individual Turn counter; Skip does not. Newly added participants join the current Round. Drag-and-drop reordering, insertion, and manual active selection do not themselves change either counter.
- R6: Next and Skip advance to the next participant in the current cyclic order, move the former active participant to the bottom of the active-first sequence, and save the resulting order. An already completed participant's repeated action does not finish the Round early. The DM can select any participant active when an exception is needed.
- R8: A manual reorder changes the relative cyclic order until another manual reorder; ordinary Next and Skip rotations preserve that relative cyclic order. A canceled drag or a drop in the original position leaves the sequence, active participant, and both counter types unchanged.
- R9: Provide a keyboard-accessible way to move entries with the same behavior as drag and drop, and keep the moved entry identifiable after a move.
- R10: Reordering requires permission to maintain the encounter, enforced on direct requests as well as in the UI. Reorder requests against an ended encounter do not change its stopped sequence.

## Acceptance criteria

Order examples below name the **saved** order. The visible tile list starts at the active participant and may be a cyclic rotation of it after Set active or drag-and-drop.

- [ ] The active encounter shows every PC, NPC, and mob in one ordered sequence, with exactly one participant active.
- [ ] Given initial order A (18), B (12), C (5), dragging C between A and B saves A, C, B despite C's lower initiative; the displayed list rotates to put the newly active participant first.
- [ ] Given A, B, C with A active, reordering sets B (A's pre-reorder successor) active and leaves both counters unchanged.
- [ ] The next cycle keeps the relative A, C, B sequence without re-sorting by initiative, while Next and Skip save each active-to-bottom rotation.
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
- [ ] Round increments once after every current participant has used Next or Skip in the Round; only Next increments the active participant's individual Turn counter. Repeating one participant's action does not substitute for another's.
- [ ] Drag-and-drop reordering, whether moving the active or another participant, never resets or changes either counter type.
- [ ] Two mobs with the same name can be reordered independently without losing, duplicating, or changing either participant.
- [ ] Canceling a drag or dropping in the same position has no effect on order, active participant, or counter.
- [ ] Reordering and the active-participant choice work through keyboard controls as well as drag and drop.
- [ ] Single-participant behavior remains as defined in spec 004: Next increments that participant's individual Turn and Round, while Skip increments only Round; the participant remains active.
- [ ] Unauthorized or ended-encounter reorder requests do not change the sequence.
- [ ] Reordering leaves campaign character information and other encounters unchanged.

## Validation

Exercise the examples above with PCs, NPCs, and same-name mobs. Test moving both the active participant and other participants across its position, moves to the first and last positions, canceled moves, and multiple completed Rounds. Verify that initiative never overrides the manually chosen order. Check keyboard operation, access enforcement, and encounter isolation.

The Fight UI supports drag-and-drop and keyboard Move up/down controls. Windows API smoke checks cover changed and unchanged order, pre-reorder active successor, and persistence. The published-page browser check covers keyboard Move up, an actual drag-and-drop reorder, and the resulting active successor. The API smoke check covers additional saved-order examples; full keyboard-only navigation and assistive-technology review remain for later validation.

## Open questions

None from the completed review. Decision 0025 confirms initial and final counters; spec 004 requires consistent restoration of completed changes.
