# 005: Manual encounter ordering

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0006: Use initiative only for the initial order](../decisions/0006-initial-initiative-only.md), [0079: Alpha encounter workflow](../decisions/0079-alpha-encounter-workflow.md)
- Depends on: [004: Initiative and turn sequence](004-initiative-and-turn-sequence.md)
- Reorder decision: [0080](../decisions/0080-keep-active-on-reorder-and-show-drop-slot.md)

## Problem and intended outcome

During Fight, users need to see all PCs, NPCs, and mobs in one column of tiles and rearrange their turn order by dragging and dropping entries. Initiative establishes the original order at the Fight transition. Next and Skip move the active tile to the bottom and save that order. New participants are inserted immediately before the active participant in saved order and can then be reordered.

## Scope

Included: displaying the full participant list, dragging entries to new positions during an active encounter, and using the resulting order for Next and subsequent cycles.

Adding PCs, NPCs, and mobs while running is covered by specs 003 and 004. New entries appear immediately before the active participant, preserve the active highlight, and can be dragged elsewhere. Participants cannot be removed during Fight. Spec 004 requires restoring saved order, active participant, Round, and individual Turn counters when Janus reopens. Undo remains outside this requirement.

## Requirements

- R1: An active encounter displays all of its PCs, NPCs, and individual mobs in a single column of tiles, starting with the active participant and continuing cyclically in saved order. The active tile is highlighted and labeled. Long lists may scroll, but participants must remain accessible.
- R2: An authorized user can drag a participant across PC, NPC, and mob categories. During the drag, an arrow and line identify the exact insertion slot between displayed tiles or after the final tile. No slot appears before the active-first tile. Dropping commits the new order and preserves the relative order of all other entries.
- R3: Initiative constructs the order when the DM confirms Fight after the lightbox review. Display recorded initiative during Fight. Next, Skip, manual reordering, and adding a participant must not sort by initiative. New participants can be inserted without initiative entry; show no initiative value unless one was entered. Recorded values remain informational and do not control Fight order.
- R4: Reordering changes only the encounter's sequence. It does not change participant identity, category, initiative values, campaign records, or another encounter's order. Same-name mobs remain individually addressable.
- R5: Adding or reordering participants leaves the current participant highlighted. A reorder changes saved order only; it does not advance the turn or change Round, individual Turn counters, or current-Round completion. The active participant remains first in the displayed cyclic order after the reorder.
- R13: During Fight, newly added PCs, NPCs, and mobs are inserted immediately before the active participant. Adding an entry alone does not change the active highlight. The new entry can then be reordered like any other participant.
- R11: The dungeon master can explicitly set any participant as active using a control available during Fight. Exactly one participant is active. Selecting a participant does not reorder the list or change Round or individual Turn counters.
- R12: Round increments after every participant in the current Round has used Next or Skip once. Each Next increments only the active participant's individual Turn counter; Skip does not. Newly added participants join the current Round. Drag-and-drop reordering, insertion, and manual active selection do not themselves change either counter.
- R6: Next and Skip advance to the next participant in the current cyclic order, move the former active participant to the bottom of the active-first sequence, and save the resulting order. An already completed participant's repeated action does not finish the Round early. The DM can select any participant active when an exception is needed.
- R8: A manual reorder changes the relative cyclic order until another manual reorder; ordinary Next and Skip rotations preserve that relative cyclic order. A canceled drag or a drop in the original position leaves the sequence, active participant, and both counter types unchanged.
- R9: Remove Move up/down buttons from participant cards. Provide a keyboard-accessible alternative: focus a Fight tile and use Alt+ArrowUp or Alt+ArrowDown to move it one slot with the same active-preserving behavior as drag and drop. Explain the shortcut near the list and keep the moved entry identifiable after a move.
- R10: Reordering requires permission to maintain the encounter, enforced on direct requests as well as in the UI. Reorder requests against an ended encounter do not change its stopped sequence.

## Acceptance criteria

Order examples below name the **saved** order. The visible tile list starts at the active participant and may be a cyclic rotation of it after Set active or drag-and-drop.

- [ ] The active encounter shows every PC, NPC, and mob in one ordered sequence, with exactly one participant active.
- [ ] Given initial order A (18), B (12), C (5) with A active, dragging C between A and B saves and displays A, C, B despite C's lower initiative; A stays active.
- [ ] During a drag, an arrow marks the slot between the two tiles where the entry will land, or the slot after the final tile. The marker clears after drop or cancel; no whole-tile drop outline appears.
- [ ] Given A, B, C with A active, reordering leaves A active and both counters unchanged.
- [ ] The next cycle keeps the relative A, C, B sequence without re-sorting by initiative, while Next and Skip save each active-to-bottom rotation.
- [ ] Initiative values remain displayed after reordering and do not change the manually selected order.
- [ ] Given A, B, C with B active, the displayed list begins B, C, A. Moving A between B and C saves B, A, C and keeps B active.
- [ ] Given A, B, C with A active, moving B after C saves A, C, B and keeps A active.
- [ ] Given A, B, C with C active, the displayed list begins C, A, B. Moving A after B saves C, B, A and keeps C active.
- [ ] After any reorder, Next advances to the participant immediately following the current active participant in the resulting current list.
- [ ] Given a single participant A, reordering/no-op behavior leaves A active.
- [ ] The dungeon master can manually set any participant, including an unconscious participant, as active. The selected entry becomes the only active entry while Round and all individual Turn counters remain unchanged.
- [ ] Adding a mob immediately before the active participant leaves that participant highlighted; a subsequent reorder also leaves that participant active.
- [ ] Moving a non-active or active participant leaves the active participant unchanged, without a prompt, and leaves counters unchanged.
- [ ] Manually selecting any participant and inserting a mob immediately before the active participant leave both counter types unchanged.
- [ ] Round increments once after every current participant has used Next or Skip in the Round; only Next increments the active participant's individual Turn counter. Repeating one participant's action does not substitute for another's.
- [ ] Drag-and-drop reordering, whether moving the active or another participant, never resets or changes either counter type.
- [ ] Two mobs with the same name can be reordered independently without losing, duplicating, or changing either participant.
- [ ] Canceling a drag or dropping in the same position has no effect on order, active participant, or counter.
- [ ] No participant card shows Move up/down buttons. Focusing a Fight tile and pressing Alt+ArrowUp or Alt+ArrowDown moves it one slot without changing the active participant; Set active remains a separate explicit action.
- [ ] Single-participant behavior remains as defined in spec 004: Next increments that participant's individual Turn and Round, while Skip increments only Round; the participant remains active.
- [ ] Unauthorized or ended-encounter reorder requests do not change the sequence.
- [ ] Reordering leaves campaign character information and other encounters unchanged.

## Validation

Exercise the examples above with PCs, NPCs, and same-name mobs. Test moving both the active participant and other participants, insertion slots between tiles and after the last tile, canceled moves, and multiple completed Rounds. Verify that initiative never overrides the manually chosen order. Check keyboard operation, access enforcement, and encounter isolation.

The Fight UI supports drag-and-drop and Alt+ArrowUp/Down keyboard reordering without Move buttons. Windows API smoke checks cover changed and unchanged order, active preservation, and persistence. The browser check covers the keyboard shortcut, insertion markers between tiles and at the end, actual drag-and-drop reorders, and active preservation. Full assistive-technology review remains for later validation.

## Open questions

None from the completed review. Decision 0025 confirms initial and final counters; spec 004 requires consistent restoration of completed changes.
