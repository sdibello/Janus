# 005: Manual encounter ordering

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0006: Use initiative only for the initial order](../decisions/0006-initial-initiative-only.md)
- Depends on: [004: Initiative and turn sequence](004-initiative-and-turn-sequence.md)
- Active-participant decision: [0012](../decisions/0012-active-participant-selection.md)

## Problem and intended outcome

During Fight, users need to see all PCs, NPCs, and mobs and rearrange their turn order by dragging and dropping entries. Initiative establishes the original order during Prepare. During Fight, new mobs are inserted wherever the dungeon master chooses and all participants follow the current list order.

## Scope

Included: displaying the full participant list, dragging entries to new positions during an active encounter, and using the resulting order for Next and subsequent cycles.

Mob additions while running are covered by spec 003 and their sequence behavior by spec 004; added mobs can be reordered like existing participants. Spec 004 requires restoring saved order, active participant, and counter when Janus reopens. Adding PCs/NPCs, removing participants while running, and undo remain outside this requirement. The proposed mid-cycle behavior below needs confirmation.

## Requirements

- R1: An active encounter displays all of its PCs, NPCs, and individual mobs in the current turn order, with the active participant highlighted. Long lists may scroll, but participants must remain accessible.
- R2: An authorized user can drag any participant entry to a different position, including across PC, NPC, and mob categories. Moving a non-active participant commits the order on drop. Moving the active participant requires the selection in R5 before completion. Preserve the relative order of the other entries.
- R3: Initiative constructs the order during Prepare only. During Fight, Next, wraparound, manual reordering, and adding a mob must not sort by initiative. A new mob can be inserted at any chosen position without initiative entry. Original initiative values may remain visible as reference information but do not control Fight order.
- R4: Reordering changes only the encounter's sequence. It does not change participant identity, category, initiative values, campaign records, or another encounter's order. Same-name mobs remain individually addressable.
- R5: Adding a participant or moving a non-active participant leaves the current participant highlighted. When the dungeon master moves the active participant to a different position, prompt for one of three choices: keep the moved participant active, activate the participant that followed it in the order before the move, or select another encounter participant. Apply the chosen highlight with the reordered list; exactly one participant is active. Identify choices by participant identity, not name alone.
- R11: Proposed prompt handling: hold the move pending until a choice is confirmed; cancel restores the pre-move order and highlight. Do not advance turns while the choice is pending. If the moved participant was last, propose its former first participant as its former successor. Reordering and active selection do not change the Turn counter under the proposed counter policy; these edge-case defaults remain to be confirmed.
- R6: Proposed Next behavior: advance to the entry immediately after the active participant's new position. If the active participant is now last, Next returns to the first entry and increments Turn once. This is positional traversal, without tracking whether each participant has already acted during that cycle.
- R7: Consequently, moving entries across the active position can cause a participant to act again or miss an opportunity before the next wraparound. This is an explicit consequence of the proposed positional rule, pending confirmation.
- R8: The new order remains in effect for subsequent cycles until another reorder. A canceled drag or a drop in the original position leaves the sequence, active participant, and counter unchanged.
- R9: Provide a keyboard-accessible way to move entries with the same behavior as drag and drop, and keep the moved entry identifiable after a move.
- R10: Reordering requires permission to maintain the encounter, enforced on direct requests as well as in the UI. Reorder requests against an ended encounter do not change its stopped sequence.

## Acceptance criteria

- [ ] The active encounter shows every PC, NPC, and mob in one ordered sequence, with exactly one participant active.
- [ ] Given initial order A (18), B (12), C (5), dragging C between A and B produces A, C, B despite C's lower initiative.
- [ ] Under the proposed behavior, if A is active, that drop leaves A active and Turn unchanged; Next highlights C, then B, then A and increments Turn on that wraparound.
- [ ] The next cycle still follows A, C, B without re-sorting by initiative.
- [ ] Given A, B, C with B active, moving B to the end prompts to keep B active, activate C (its former successor), or select another participant.
- [ ] Choosing to keep B active produces A, C, B with B highlighted. Next wraps to A under the proposed positional rule.
- [ ] Choosing the former successor produces A, C, B with C highlighted; Next highlights B under the proposed positional rule.
- [ ] Choosing another participant, such as A, produces A, C, B with that chosen participant highlighted.
- [ ] Adding a mob before or after the active participant leaves that participant highlighted.
- [ ] Moving a non-active participant leaves the active highlight unchanged and does not prompt for active-participant selection.
- [ ] Under proposed prompt handling, canceling the active move restores the previous order and highlight, and confirming any selection leaves the counter unchanged.
- [ ] Given A, B, C with B active, moving C before B produces A, C, B. Next wraps to A; it does not force C to act before wrapping under the proposed positional rule.
- [ ] Two mobs with the same name can be reordered independently without losing, duplicating, or changing either participant.
- [ ] Canceling a drag or dropping in the same position has no effect on order, active participant, or counter.
- [ ] Reordering and the active-participant choice work through keyboard controls as well as drag and drop.
- [ ] Single-participant behavior remains as defined in spec 004: Next increments Turn and keeps that participant active.
- [ ] Unauthorized or ended-encounter reorder requests do not change the sequence.
- [ ] Reordering leaves campaign character information and other encounters unchanged.

## Validation

When implementation exists, exercise the examples above with PCs, NPCs, and same-name mobs. Test moving both the active participant and other participants across its position, moves to the first and last positions, canceled moves, and multiple wraparounds. Verify that initiative never overrides the manually chosen order. Check keyboard operation, access enforcement, and encounter isolation.

No application code or executable tests exist yet.

## Open questions

- Confirm positional Next behavior from the selected active participant, even when this repeats or skips a participant within a cycle. An alternative would track who has already acted, which requires different cycle rules.
- Confirm that the counter changes only on Next wraparound, not on an active-participant selection; that canceling the prompt cancels the move; and that the former successor of the last participant is the former first participant.
- Should original initiative values remain visible during the encounter or be hidden after initial ordering?
- Pending active-move interruption behavior is proposed in spec 004; completed order and active-participant changes must be restored together on reopening.
