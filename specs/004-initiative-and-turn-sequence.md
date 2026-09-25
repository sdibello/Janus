# 004: Initiative and turn sequence

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0005: Advance encounter turns manually](../decisions/0005-manual-encounter-turns.md)
- Depends on: [003: Encounters and participants](003-encounters-and-participants.md)
- Phase decision: [0011: Prepare and Fight phases](../decisions/0011-prepare-and-fight.md)
- Persistence decision: [0013: Preserve encounters when Janus reopens](../decisions/0013-resume-encounters.md)

## Problem and intended outcome

Users need to run an encounter by entering initiative for each participant and stepping through their turns. Janus highlights one PC, NPC, or mob at a time, repeats the sequence after the final participant, and counts completed cycles using a displayed Turn counter.

In this requirement, a participant's turn is its individual opportunity to act. The displayed Turn counter identifies the full cycle through all participants; it does not increment for every participant.

## Scope

Included: starting an encounter, prompting for initiative, ordering participants, highlighting the active participant, advancing with Next, incrementing the Turn counter on wraparound, and stopping with End encounter.

Encounters run through Prepare and Fight phases, followed by a Finished state. Prepare records initiative and establishes the initial order. Fight uses manual ordering under [spec 005](005-manual-encounter-order.md), including placing new mobs wherever the dungeon master chooses. Initiative does not control Fight ordering. Saved encounter progress is restored when Janus is reopened. Automatic initiative rolls, combat calculations, delays, readied actions, and undo are outside this draft. Adding PCs/NPCs during Fight and removing participants during play remain open questions.

## Requirements

### Prepare and transition to Fight

- R1: Starting an encounter opens its Prepare phase. The UI identifies the current phase. No participant is taking a turn during Prepare, and Next is unavailable.
- R2: During Prepare, Janus records initiative for every PC, NPC, and individual mob entry. Entries with the same name remain separate participants. The dungeon master can enter and correct initiative, with the initial order updated accordingly.
- R3: All participants present in Prepare must have valid initiative before entering Fight. Missing or invalid values are identified for correction; participants are not silently omitted or assigned defaults. This gate does not apply to mobs added after Fight begins.
- R4: Proposed numeric format: signed whole numbers, including zero and negative values. The accepted range must be defined before implementation.
- R5: Proposed initial ordering: highest initiative first, with equal initiatives preserving participant addition order. Tie handling is a proposed default pending confirmation. Once running, use the current list order, including manual changes under spec 005; never re-sort by initiative at cycle boundaries.
- R6: An empty encounter cannot begin a turn sequence. The user is prompted to add participants first; saving an empty encounter remains allowed under spec 003.
- R7: After preparing the order, the dungeon master explicitly chooses Fight to begin the sequence. The first participant is highlighted. Proposed initial Turn counter value: 1. Merely completing initiative entry does not automatically begin Fight.

### Advance and repeat

- R8: Exactly one participant is active while the encounter is running. The ordered list shows participant names and categories; original initiative values may optionally be shown as reference information. The active entry is highlighted and explicitly labeled so its state does not depend on color alone.
- R9: The active participant remains unchanged until the user clicks Next, chooses an active participant after moving the currently active entry under spec 005, or ends the encounter. Adding a participant does not change the highlight. No timer automatically advances the sequence.
- R10: Each Next action advances to the next participant in the current list order and removes the previous participant's active highlight. The Turn counter remains unchanged until wraparound. Spec 005 defines proposed behavior when participants are reordered during a cycle.
- R11: When Next is clicked for the last participant, the sequence returns to the first participant and the Turn counter increments by exactly one.
- R12: With a single participant, Next keeps that participant active and increments the Turn counter by one.
- R23: Include Unconscious and alive adjacent participants in the normal turn sequence. Next highlights each in list order without automatic skipping; HP-derived status changes do not advance the turn. This also applies after restoring an encounter.
- R13: Initiative values and running sequence state belong to this encounter and do not modify campaign character records or other encounters.
- R18: In Prepare, new mobs receive initiative and join the initial initiative-based order. During Fight, the dungeon master can insert a new mob at any chosen position, including first, last, or between entries, without entering initiative. Preserve the relative order of existing participants and do not re-sort them. Insertion leaves the active participant highlighted. The mob can subsequently be dragged elsewhere. Proposed behavior: insertion leaves the Turn counter unchanged, and the mob first acts when traversal reaches its chosen position; this timing remains to be confirmed.

### End and access

- R14: An End encounter button is available throughout the running sequence, including on the first participant's turn.
- R15: End encounter stops the sequence, clears the active participant highlight, and disables or removes Next. Further advance requests cannot change the stopped sequence or counter.
- R16: Ending the sequence preserves the encounter and its participants, including encounter-local mobs, for later viewing from its campaign under spec 003. Proposed display content includes final order and Turn counter. The finished UI offers viewing without modification controls; immutable storage is not required. Viewing does not restart the encounter.
- R17: Starting, advancing, and ending an encounter use the same authorization rules as maintaining that encounter. Direct requests enforce these rules as well as the UI.

### Persistence and resumption

HP tracking is defined in [spec 007](007-hit-point-tracking.md) and is part of the saved participant state restored below.

- R19: Maintain the encounter across refresh, navigation away, closing/reopening Janus, and logout/login. Restore its phase, saved participants (including mobs added during Fight), recorded initiative, current manual order, active participant, and Turn counter when the authorized dungeon master reopens it.
- R20: Save completed encounter changes as part of normal interaction without a separate save-before-exit step. Preserve preparation progress as well as Fight progress. Reopening must not rerun initiative sorting, reset the counter, advance a turn, or finish the encounter automatically.
- R21: Save related order and active-participant changes consistently so a restored Fight has exactly one valid active participant. A pending active-move prompt must not leave a half-applied saved move. Proposed interruption behavior: restore the last completed state if the move's active-participant choice was not confirmed.
- R22: Persistence is separate from login state. If authentication is needed on return, the encounter remains saved and can be reopened after login. A finished encounter remains Finished and uses the viewing-only UI.

## Acceptance criteria

- [ ] Start encounter opens Prepare and prompts for initiative for every PC, NPC, and mob, including separate mobs with the same name.
- [ ] During Prepare, initiative edits update the initial order; no participant is active and Next is unavailable.
- [ ] Entering all initiative values does not begin Fight until the dungeon master chooses Fight.
- [ ] Missing or invalid initiative prevents the sequence from beginning and identifies the entries needing correction.
- [ ] An empty encounter cannot begin a sequence and offers guidance to add participants.
- [ ] Under the proposed ordering, a PC at 18, NPC at 12, and mob at 5 appear in that order; the PC is initially active and Turn displays 1.
- [ ] The first Next highlights the NPC and clears the PC highlight; the second highlights the mob. Turn remains 1.
- [ ] The next Next returns to the PC and changes Turn to 2. Subsequent full cycles increment it once each.
- [ ] Equal initiative values use the agreed tie rule for the initial order. Subsequent cycles preserve the current list order, including manual changes, without reapplying initiative or tie rules.
- [ ] A single-participant encounter keeps that participant highlighted on Next while increasing Turn by one.
- [ ] Waiting without clicking Next does not change the active participant or counter.
- [ ] End encounter works from any active participant, clears the highlight, and prevents further advancement.
- [ ] Ending preserves the saved encounter and all participants, including mobs.
- [ ] Running or ending one encounter leaves campaign character records and other encounters unchanged.
- [ ] Unauthorized start, advance, and end requests are denied.
- [ ] During Prepare, adding a mob with initiative 15 to an initial order of 18, 12, 5 yields 18, 15, 12, 5 under the proposed descending order.
- [ ] During Fight, the dungeon master can add a mob at the first, last, or any intermediate position without initiative entry and without changing existing participants' relative order.
- [ ] After insertion, dragging the mob elsewhere changes its position without initiative undoing that move on Next or wraparound.
- [ ] After recording some initiative values in Prepare, closing and reopening Janus restores those saved values and the Prepare phase without starting Fight.
- [ ] During Fight, add a mob, reorder participants, select the active participant, and advance beyond the first cycle. Closing and reopening Janus restores the same saved participants, order, highlight, and counter.
- [ ] Refreshing or logging out and back in preserves the same encounter state without reapplying initiative sorting or advancing a turn.
- [ ] Under the proposed pending-move policy, closing Janus before confirming the active-participant prompt restores the pre-move order and highlight together.
- [ ] Reopening a finished encounter keeps it Finished and does not restart the sequence.

## Validation

When implementation exists, verify the sequence using the three-participant example above for at least two full cycles. Cover tied initiative, invalid and missing input, empty and single-participant encounters, and multiple mobs with the same name. Check that exactly one participant is active while running and none is active after ending.

Exercise End encounter at the first, middle, and final participant, then attempt to advance through the UI and a direct request. Verify encounter isolation and authorization. Check reopening, refresh, and logout/login in Prepare, Fight, and Finished, including saved mob additions, reordered entries, a selected active participant, and a counter beyond 1. Verify consistent restoration around a pending active-move prompt. No application code or executable tests exist yet.

## Open questions

- Confirm highest-first initiative order and the proposed tie rule, or specify manual tie ordering.
- Confirm whole-number initiative, including zero and negatives, and define its allowed range.
- Confirm that the displayed Turn counter starts at 1 and retains its final value when ended.
- Insertion is confirmed to preserve the active highlight. Confirm that it also leaves the counter unchanged and that the mob first acts when Next reaches its chosen position (possibly after wraparound). Adding PCs/NPCs during Fight and removing participants remain undecided.
- Confirm restoring the last completed state when Janus closes with an active-participant move prompt still pending.
- Can the dungeon master return from Fight to Prepare, or is that transition one-way for this phase?
