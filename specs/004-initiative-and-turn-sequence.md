# 004: Initiative and turn sequence

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0005: Advance encounter turns manually](../decisions/0005-manual-encounter-turns.md)
- Depends on: [003: Encounters and participants](003-encounters-and-participants.md)
- Phase decision: [0011: Prepare and Fight phases](../decisions/0011-prepare-and-fight.md)
- Persistence decision: [0013: Preserve encounters when Janus reopens](../decisions/0013-resume-encounters.md)

## Problem and intended outcome

Users need to run an encounter by entering initiative for each participant and stepping through their turns. Janus highlights one PC, NPC, or mob at a time. A Round counter tracks full cycles through the list, and each participant has an individual Turn counter.

A participant's turn is its individual opportunity to act. Each participant's Turn counter records how many times the DM has clicked Next while that participant was active. The Round counter records full cycles and increments when Next wraps from the last participant to the first.

## Scope

Included: starting an encounter, prompting for initiative, ordering participants, highlighting the active participant, advancing with Next or Skip, maintaining Round and individual Turn counters, and stopping with End encounter.

Encounters run through Prepare and Fight phases, followed by a Finished state. Prepare records initiative and establishes the initial order. Fight uses manual ordering under [spec 005](005-manual-encounter-order.md), including adding PCs, NPCs, and mobs immediately before the active participant. Initiative does not control Fight ordering. Saved encounter progress is restored when Janus is reopened. Automatic initiative rolls, combat calculations, delays, readied actions, and undo are outside this draft. Removing participants during play remains an open question.

## Requirements

### Prepare and transition to Fight

- R1: Starting an encounter opens its Prepare phase. The UI identifies the current phase. No participant is taking a turn during Prepare, and Next is unavailable.
- R2: During Prepare, Janus records initiative for every PC, NPC, and individual mob entry. Entries with the same name remain separate participants. The dungeon master can enter and correct initiative, with the initial order updated accordingly.
- R3: All participants present in Prepare must have valid initiative before entering Fight. Missing or invalid values are identified for correction; participants are not silently omitted or assigned defaults. This gate does not apply to mobs added after Fight begins.
- R4: Initiative values are whole numbers with no application-defined upper or lower limit. Positive, negative, and zero values are allowed.
- R5: The initial order sorts participants from highest initiative to lowest. During Prepare, the dungeon master manually orders participants whose initiative values tie. After entering Fight, use the current list order, including manual changes under spec 005; never re-sort by initiative at cycle boundaries.
- R6: An empty encounter cannot begin a turn sequence. The user is prompted to add participants first; saving an empty encounter remains allowed under spec 003.
- R7: After preparing the order, the dungeon master explicitly chooses Fight to begin the sequence. The first participant is highlighted. Round starts at 1; each participant's individual Turn counter starts at 0. Merely completing initiative entry does not automatically begin Fight.
- R27: The transition from Prepare to Fight is one-way. Once Fight begins, the encounter cannot return to Prepare. Ending Fight moves it to Finished, which remains viewable under the finished-encounter rules.

### Advance and repeat

- R8: Exactly one participant is active while the encounter is running. The ordered list always shows participant names, categories, and their initiative values. For participants added during Fight, show no initiative value unless the DM entered one; initiative is not required for Fight additions. The active entry is highlighted and explicitly labeled so its state does not depend on color alone.
- R9: The active participant remains unchanged until the user clicks Next, the participant list is reordered (which selects the former active participant's pre-reorder successor under spec 005), the dungeon master manually selects any participant under spec 005, or the encounter ends. Adding a participant does not change the highlight. No timer automatically advances the sequence.
- R10: Each Next action advances to the next participant in the current list order under [decision 0021](../decisions/0021-next-follows-current-order.md) and removes the previous participant's active highlight. Increment the individual Turn counter for the participant whose turn was active when Next was clicked.
- R25: A Skip action advances from the active participant to the next participant in current order, or to the first participant when the active participant is last. Skip does not increment the skipped participant's individual Turn counter. It does not change Round; Round increments only when Next completes the last participant's turn and wraps to the first.
- R26: Participants cannot be removed during Fight. Next, Skip, and participant reordering continue to operate on the complete current list.
- R28: No Back or undo-turn button is provided in this phase. If the DM advances accidentally, they can manually set the intended participant active; counter corrections are not provided.
- R11: Maintain a separate individual Turn counter for every participant. Each starts at 0 and increments whenever the user clicks Next while that participant is active. Reordering, inserting a participant, or manually selecting an active participant does not increment any individual counter.
- R12: Maintain a separate Round counter. Its initial value is 1. Increment Round by exactly one only when Next wraps from the last participant in the current list to the first. Reordering, inserting a participant, and manually selecting an active participant do not change Round.
- R24: With a single participant, Next increments that participant's individual Turn counter and wraps to the same participant, incrementing Round by one.
- R23: Include Unconscious and alive adjacent participants in the normal turn sequence. Next highlights each in list order without automatic skipping; HP-derived status changes do not advance the turn. This also applies after restoring an encounter.
- R13: Initiative values and running sequence state belong to this encounter and do not modify campaign character records or other encounters.
- R18: During Fight, the dungeon master can add a PC or NPC from the encounter's campaign, or create a mob within the encounter, at any time and without entering initiative. Insert every new participant immediately before the current active participant, preserving the relative order of existing participants. Keep the current participant highlighted and leave Round and existing individual Turn counters unchanged; the new participant's Turn counter starts at 0. The DM can then drag and drop it elsewhere. Next follows the ordinary current-order rule, without special first-turn behavior.

### End and access

- R14: An End encounter button is available throughout the running sequence, including on the first participant's turn.
- R15: End encounter stops the sequence, clears the active participant highlight, and disables or removes Next. Further advance requests cannot change the stopped sequence or counter.
- R16: Ending the sequence preserves the encounter and its participants, including encounter-local mobs, for later viewing from its campaign under spec 003. The finished UI displays final order, Round counter, and each participant's individual Turn counter, without modification controls. Immutable storage is not required. Viewing does not restart the encounter.
- R17: Starting, advancing, and ending an encounter use the same authorization rules as maintaining that encounter. Direct requests enforce these rules as well as the UI.

### Persistence and resumption

HP tracking is defined in [spec 007](007-hit-point-tracking.md) and is part of the saved participant state restored below.

- R19: Maintain the encounter across refresh, navigation away, closing/reopening Janus, and logout/login. Restore its phase, saved participants (including mobs added during Fight), recorded initiative, current manual order, active participant, Round counter, and individual Turn counters when the authorized dungeon master reopens it. Preserve and display final counter values for finished encounters.
- R20: Save completed encounter changes as part of normal interaction without a separate save-before-exit step. Preserve preparation progress as well as Fight progress. Reopening must not rerun initiative sorting, reset the counter, advance a turn, or finish the encounter automatically.
- R21: Save order and active-participant changes consistently so a restored Fight has exactly one valid active participant.
- R22: Persistence is separate from login state. If authentication is needed on return, the encounter remains saved and can be reopened after login. A finished encounter remains Finished and uses the viewing-only UI.

## Acceptance criteria

- [ ] Start encounter opens Prepare and prompts for initiative for every PC, NPC, and mob, including separate mobs with the same name.
- [ ] During Prepare, initiative edits update the initial order; no participant is active and Next is unavailable.
- [ ] Initiative values remain visible for participants throughout Prepare and Fight, including after drag-and-drop reordering.
- [ ] Entering all initiative values does not begin Fight until the dungeon master chooses Fight.
- [ ] After entering Fight, no UI control or authorized workflow returns the encounter to Prepare.
- [ ] Missing or invalid initiative prevents the sequence from beginning and identifies the entries needing correction.
- [ ] Positive, negative, and zero whole-number initiative values are accepted without an application-defined range limit; fractional values are rejected.
- [ ] An empty encounter cannot begin a sequence and offers guidance to add participants.
- [ ] Under the proposed ordering, a PC at 18, NPC at 12, and mob at 5 appear in that order; the PC is initially active, Round displays 1, and each individual Turn counter displays 0.
- [ ] Clicking Next while the PC is active increments the PC's individual Turn counter by one, highlights the NPC, and leaves other participant counters unchanged.
- [ ] Clicking Skip while the PC is active highlights the NPC without incrementing the PC's individual Turn counter or changing Round.
- [ ] When Next wraps from the last participant to the first, Round increments by one and only the participant whose turn ended has its individual Turn counter incremented.
- [ ] Clicking Skip while the last participant is active highlights the first participant without incrementing Round or the skipped participant's individual Turn counter.
- [ ] No control or flow removes a participant from the encounter during Fight; all remain in the ordered list and turn sequence.
- [ ] Participants with equal initiative can be manually reordered during Prepare, and that tie order is used when Fight begins and remains in effect until the dungeon master changes the order.
- [ ] A single-participant encounter keeps that participant highlighted, increments its individual Turn counter, and increments Round on each Next click.
- [ ] Waiting without clicking Next does not change the active participant or Round or any individual Turn counter.
- [ ] End encounter works from any active participant, clears the highlight, and prevents further advancement.
- [ ] Ending preserves the saved encounter and all participants, including mobs.
- [ ] Running or ending one encounter leaves campaign character records and other encounters unchanged.
- [ ] Unauthorized start, advance, and end requests are denied.
- [ ] During Prepare, adding a mob with initiative 15 to an initial order of 18, 12, 5 yields 18, 15, 12, 5 under the proposed descending order.
- [ ] During Fight, the dungeon master can add a PC or NPC from the campaign or create a mob at any time, without initiative entry.
- [ ] A new participant is inserted immediately before the active participant; existing entries retain their relative order, the active highlight stays on the same participant, Round and existing individual Turn counters are unchanged, and the new individual Turn counter starts at 0.
- [ ] The dungeon master can then drag and drop the new entry to another position; Next follows the resulting current order.
- [ ] After insertion, dragging the mob elsewhere changes its position without initiative undoing that move on Next or wraparound.
- [ ] After recording some initiative values in Prepare, closing and reopening Janus restores those saved values and the Prepare phase without starting Fight.
- [ ] During Fight, add a mob, reorder participants, select the active participant, and advance beyond the first cycle. Closing and reopening Janus restores the same saved participants, order, highlight, and Round and individual Turn counters.
- [ ] Refreshing or logging out and back in preserves the same encounter state without reapplying initiative sorting or advancing a turn.
- [ ] Reopening a finished encounter keeps it Finished and does not restart the sequence.

## Validation

When implementation exists, verify the sequence using the three-participant example above for at least two full cycles. Cover tied initiative, invalid and missing input, empty and single-participant encounters, and multiple mobs with the same name. Check that exactly one participant is active while running and none is active after ending.

Exercise End encounter at the first, middle, and final participant, then attempt to advance through the UI and a direct request. Verify encounter isolation and authorization. Check reopening, refresh, and logout/login in Prepare, Fight, and Finished, including saved mob additions, reordered entries, a selected active participant, and a counter beyond 1. Verify consistent restoration around a pending active-move prompt. No application code or executable tests exist yet.

## Open questions

- Removing participants during play remains undecided.
