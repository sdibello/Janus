# 004: Initiative and turn sequence

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0005: Advance encounter turns manually](../decisions/0005-manual-encounter-turns.md)
- Depends on: [003: Encounters and participants](003-encounters-and-participants.md)
- Alpha workflow decision: [0079: Initiative prompt and rotating Fight order](../decisions/0079-alpha-encounter-workflow.md)
- Persistence decision: [0013: Preserve encounters when Janus reopens](../decisions/0013-resume-encounters.md)

## Problem and intended outcome

Users need to run an encounter by entering initiative for each participant and stepping through their turns. Janus highlights one PC, NPC, or mob at a time. A Round counter tracks full cycles through the list, and each participant has an individual Turn counter.

A participant's Turn counter records how many times the DM has clicked Next while that participant was active. A Round completes after every current participant has used Next or Skip once; Skip never increments an individual Turn counter.

## Scope

Included: starting an encounter, prompting for initiative, ordering participants, highlighting the active participant, advancing with Next or Skip, maintaining Round and individual Turn counters, and stopping with End encounter.

Encounters run through Prepare and Fight phases, followed by a Finished state. Prepare manages participants and optional starting HP. Begin Fight prompts for initiative and establishes the initial order. Fight uses manual ordering under [spec 005](005-manual-encounter-order.md), including adding PCs, NPCs, and mobs immediately before the active participant. Initiative does not control Fight ordering. Saved encounter progress is restored when Janus is reopened. Automatic initiative rolls, combat calculations, delays, readied actions, and undo are outside this draft. Participants cannot be removed during Fight under decision 0079.

## Requirements

### Prepare and transition to Fight

- R1: Starting an encounter opens its Prepare phase. The UI identifies the current phase. No participant is taking a turn during Prepare, and Next is unavailable.
- R2: Begin Fight opens a lightbox prompting for one PC, NPC, or individual mob's initiative at a time. Only initiative is entered in that prompt. Save each answer with the Prepare encounter; closing the lightbox returns to Prepare without starting Fight and retains partial values. Existing saved values prefill prompts after reopening.
- R3: All active participants present in Prepare must have valid initiative before entering Fight. Held participants require no initiative and are omitted from the initial turn order. Missing or invalid active values are identified for correction; active participants are not silently omitted or assigned defaults. This gate does not apply to participants released from Hold or added after Fight begins.
- R4: Initiative values are whole numbers with no application-defined upper or lower limit. Positive, negative, and zero values are allowed.
- R5: The initial order sorts participants from highest initiative to lowest. Equal values keep the order participants entered the encounter. After entering Fight, use the current list order, including manual changes under spec 005; never re-sort by initiative at cycle boundaries.
- R6: An encounter with no active participants cannot begin a turn sequence, even if participants are on Hold. The user is prompted to add or release an active participant first; saving an empty encounter remains allowed under spec 003.
- R7: After the last initiative answer, show the initial order for review. The dungeon master explicitly confirms Fight to begin the sequence. The first participant is highlighted. Round starts at 1; each participant's individual Turn counter starts at 0. Merely completing initiative entry does not automatically begin Fight.
- R27: The transition from Prepare to Fight is one-way. Once Fight begins, the encounter cannot return to Prepare. Ending Fight moves it to Finished, which remains viewable under the finished-encounter rules.

### Advance and repeat

- R8: Exactly one participant is active while a running encounter has active participants. If all participants are held, no one is active and turns pause until a participant joins the active list. A single column of tiles shows the active participant first, followed by the current cyclic order. The Hold list appears above it. Show participant names, categories, and recorded initiative values where applicable. The active tile is highlighted and explicitly labeled so its state does not depend on color alone.
- R29: Show Next and Skip on the active participant's Fight tile, and on no other participant tile or detached toolbar. End encounter remains available at encounter level.
- R9: The active participant remains unchanged until the user clicks Next or Skip, the dungeon master manually selects any participant under spec 005, or the encounter ends. Adding or reordering participants does not change the highlight. No timer automatically advances the sequence.
- R10: Each Next action moves the active tile to the bottom of the active-first sequence and saves that order, then highlights the new first tile. Increment the individual Turn counter for the participant whose turn was active when Next was clicked.
- R25: Skip makes the same saved order and active-tile move as Next but does not increment the skipped participant's individual Turn counter. It counts that participant as completed for the current Round.
- R26: Participants cannot be removed during Fight. Next, Skip, and participant reordering continue to operate on the complete current list.
- R28: No Back or undo-turn button is provided in this phase. If the DM advances accidentally, they can manually set the intended participant active; counter corrections are not provided.
- R11: Maintain a separate individual Turn counter for every participant. Each starts at 0 and increments whenever the user clicks Next while that participant is active. Reordering, inserting a participant, or manually selecting an active participant does not increment any individual counter.
- R12: Maintain a separate Round counter starting at 1. Mark an active participant complete for the current Round after their first Next or Skip in it. Increment Round once when every currently active participant is complete, then clear completion for the next Round. Held participants do not count toward completion. A repeated action by one participant does not substitute for another's action. A participant added or released into the active list during Fight joins the current Round as incomplete. Reordering, insertion, holding, release, and manual active selection do not themselves increment Round.
- R30: Holding a participant preserves its Turn count and leaves Round unchanged. A held participant cannot be selected active or receive Next or Skip. Releasing it into the active list keeps any previous Turn count; a newly added participant starts at zero. When the last active participant is held, active selection clears and turns pause. Releasing or adding an active participant resumes the Fight without changing Round. See [decision 0084](../decisions/0084-encounter-hold-list.md).
- R24: With a single participant, Next increments that participant's individual Turn counter and Round; Skip increments Round but not individual Turn.
- R23: Include Unconscious and alive adjacent participants in the normal turn sequence. Next highlights each in list order without automatic skipping; HP-derived status changes do not advance the turn. This also applies after restoring an encounter.
- R13: Initiative values and running sequence state belong to this encounter and do not modify campaign character records or other encounters.
- R18: During Fight, the dungeon master can add a PC or NPC from the encounter's campaign, or create a mob within the encounter, at any time and without entering initiative. Insert a new active participant immediately before the current active participant in saved order, preserving the relative order of existing participants. If no participant is active, the new active participant becomes active. A participant added to Hold stays outside the order. Keep any current active participant highlighted and leave Round and existing individual Turn counters unchanged; the new participant's Turn counter starts at 0 and, once active, it must use Next or Skip before the current Round completes. The DM can drag and drop active entries elsewhere. Next follows the ordinary current-order rule, without special first-turn behavior.

### End and access

- R14: An End encounter button is available throughout the running sequence, including on the first participant's turn.
- R15: End encounter stops the sequence, clears the active participant highlight, and disables or removes Next. Further advance requests cannot change the stopped sequence or counter.
- R16: Ending the sequence preserves the encounter and its participants, including encounter-local mobs, for later viewing from its campaign under spec 003. The finished UI displays final order, Round counter, and each participant's individual Turn counter, without modification controls. Immutable storage is not required. Viewing does not restart the encounter.
- R17: Starting, advancing, and ending an encounter use the same authorization rules as maintaining that encounter. Direct requests enforce these rules as well as the UI.

### Persistence and resumption

HP tracking is defined in [spec 007](007-hit-point-tracking.md) and is part of the saved participant state restored below.

- R19: Maintain the encounter across refresh, navigation away, closing/reopening Janus, and logout/login. Restore its phase, saved participants (including mobs added during Fight), recorded initiative, current manual order, active participant, Round counter, per-participant current-Round completion, and individual Turn counters when the authorized dungeon master reopens it. Preserve and display final counter values for finished encounters.
- R20: Save completed encounter changes as part of normal interaction without a separate save-before-exit step. Preserve partial initiative entered in the lightbox and all Fight progress. Reopening must not rerun initiative sorting, reset the counter, advance a turn, or finish the encounter automatically.
- R21: Save order and active-participant changes consistently so a restored Fight has exactly one valid active participant when its active list is nonempty, and none when all participants are held.
- R22: Persistence is separate from login state. If authentication is needed on return, the encounter remains saved and can be reopened after login. A finished encounter remains Finished and uses the viewing-only UI.

## Acceptance criteria

- [ ] Start encounter opens Prepare with collapsed participant rows and no initiative or Next controls; Begin Fight opens a one-participant-at-a-time initiative lightbox.
- [ ] Closing the lightbox returns to Prepare. Saved partial initiative prepopulates the next attempt and survives reopening Janus.
- [ ] Recorded initiative is visible in the Fight-start review and during Fight, including after drag-and-drop reordering.
- [ ] Entering all initiative values shows the initial order for review; Fight begins only after explicit confirmation.
- [ ] After entering Fight, no UI control or authorized workflow returns the encounter to Prepare.
- [ ] Missing or invalid initiative for an active participant prevents the sequence from beginning and identifies the entry needing correction; held participants require none.
- [ ] A held participant does not receive a turn or count toward Round; holding or releasing changes neither Round nor any Turn count.
- [ ] Holding the last active participant clears the active turn, and releasing one resumes the Fight without resetting saved progress.
- [ ] Positive, negative, and zero whole-number initiative values are accepted without an application-defined range limit; fractional values are rejected.
- [ ] An empty encounter cannot begin a sequence and offers guidance to add participants.
- [ ] Under the accepted ordering, a PC at 18, NPC at 12, and mob at 5 appear in that order; the PC is initially active, Round displays 1, and each individual Turn counter displays 0.
- [ ] Clicking Next while the PC is active saves NPC, mob, PC as the order, increments only the PC's individual Turn counter, and highlights the NPC at the top.
- [ ] Next and Skip appear on the currently active Fight tile only, and move to the newly active tile after a turn action or Set active. They are absent from Prepare and Finished.
- [ ] Clicking Skip while the NPC is active saves mob, PC, NPC as the order without incrementing NPC's individual Turn counter.
- [ ] Clicking Next while the mob is active increments the mob's Turn counter and Round, since PC, NPC, and mob have each used Next or Skip once.
- [ ] Selecting a participant who already acted and clicking Next again does not increment Round before all other participants act.
- [ ] No control or flow removes a participant from the encounter during Fight; all remain in the ordered list and turn sequence.
- [ ] Participants with equal initiative keep encounter entry order when Fight begins; Prepare has no tie Move Up/Down controls.
- [ ] A single-participant encounter keeps that participant highlighted and increments Round on each Next or Skip; only Next increments its individual Turn counter.
- [ ] Waiting without clicking Next does not change the active participant or Round or any individual Turn counter.
- [ ] End encounter works from any active participant, clears the highlight, and prevents further advancement.
- [ ] Ending preserves the saved encounter and all participants, including mobs.
- [ ] Running or ending one encounter leaves campaign character records and other encounters unchanged.
- [ ] Unauthorized start, advance, and end requests are denied.
- [ ] Entering 18, 12, 5, then 15 in the lightbox yields a reviewed initial order of 18, 15, 12, 5.
- [ ] During Fight, the dungeon master can add a PC or NPC from the campaign or create a mob at any time, without initiative entry.
- [ ] A new participant is inserted immediately before the active participant in saved order; existing entries retain their relative order, the active highlight stays on the same participant, Round and existing individual Turn counters are unchanged, and the new individual Turn counter starts at 0.
- [ ] A participant added after some others have acted must use Next or Skip before the current Round completes.
- [ ] The dungeon master can then drag and drop the new entry to another position; Next follows the resulting current order.
- [ ] After insertion, dragging the mob elsewhere changes its position without initiative undoing that move on Next or Skip.
- [ ] After recording some initiative values in Prepare, closing and reopening Janus restores those saved values and the Prepare phase without starting Fight.
- [ ] During Fight, add a mob, reorder participants, select the active participant, and advance beyond the first cycle. Closing and reopening Janus restores the same saved participants, order, highlight, and Round and individual Turn counters.
- [ ] Refreshing or logging out and back in preserves the same encounter state without reapplying initiative sorting or advancing a turn.
- [ ] Reopening a finished encounter keeps it Finished and does not restart the sequence.

## Validation

When implementation exists, verify the sequence using the three-participant example above for at least two full cycles. Cover tied initiative, invalid and missing input, empty and single-participant encounters, and multiple mobs with the same name. Check that exactly one participant is active while running and none is active after ending.

Exercise End encounter at the first, middle, and final participant, then attempt to advance through the UI and a direct request. Verify encounter isolation and authorization. Check reopening, refresh, and logout/login in Prepare, Fight, and Finished, including saved partial initiative, mob additions, reordered entries, a selected active participant, and a Round beyond 1. Verify saved order, active selection, Round completion, and Turn counters update atomically. Windows API smoke checks cover tie entry order, Fight commands, repeated actions by one participant, additions mid-Round, single-participant Skip, and finished-state reload. The browser check covers the initiative lightbox, canceled prompt, Fight tiles, Next, Skip, insertion, drag-and-drop, and finished reload.

## Open questions

None from the completed alpha review; decision 0079 retains the prohibition on removal during Fight.
