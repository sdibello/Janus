# 007: Hit point tracking

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0014: Track HP now; defer status and spell effects](../decisions/0014-hit-point-scope.md)
- HP fields and updates: [0015: Optional current HP and damage entry](../decisions/0015-optional-current-hp.md)
- Negative HP and status: [0016](../decisions/0016-negative-hp-and-unconscious.md)
- Confirmed status boundary: [0017](../decisions/0017-alive-adjacent.md)
- Encounter HP ownership: [0018](../decisions/0018-encounter-specific-hp.md)
- Related specs: [002: Campaign characters](002-campaigns-and-characters.md), [003: Encounter participants](003-encounters-and-participants.md), [004: Encounter flow](004-initiative-and-turn-sequence.md)

## Problem and intended outcome

The dungeon master needs to track hit points (HP) for every PC, NPC, and mob, preserving negative values. Unconscious and alive adjacent statuses are included; other statuses and spell effects remain future enhancements.

## Scope

Included: optionally entering and saving a single current HP value per encounter participant, displaying it, and entering damage to subtract from it. HP is entered afresh for each encounter, with no campaign default or carryover from another encounter. Maximum HP and a dedicated healing control are not required for this phase.

Included is automatic Unconscious status with a colored participant treatment for HP from -1 through -9, and alive adjacent at -10 or below. Other status conditions, spell effects, durations, other automatic combat rules, and temporary HP are not required by this draft.

## Requirements

- R1: Every PC, NPC, and individual mob supports one optional current HP value. There is no maximum HP field. Same-name mobs have independent values. Missing HP must not block character or mob creation, encounter preparation, entering Fight, or turn advancement.
- R2: The dungeon master can enter starting HP during each new encounter's Prepare phase and for mobs added during Fight, and update a participant's HP during Fight even when it is not that participant's turn. Starting HP remains optional. Re-entering an existing encounter restores its saved current HP rather than requesting starting HP again.
- R3: Show each participant's current HP alongside its encounter entry when supplied. Distinguish missing HP from an explicit zero; do not default missing HP to zero. HP changes must not move the participant, change the active highlight, or increment the Turn counter.
- R4: Save HP changes with encounter progress and restore them when Janus reopens, consistent with spec 004. Preserve the final HP values for viewing in finished encounters, whose UI offers no modification controls.
- R5: HP belongs to the encounter participant, not the campaign character. Each new encounter begins with HP unspecified until entered for that encounter. Do not copy HP or HP-derived status from another encounter or supply campaign HP defaults. Changes affect only this encounter. Leaving and returning to the same encounter restores its saved HP, including missing and negative values, and corresponding status.
- R6: Negative HP is allowed and must be retained exactly rather than clamped to zero or -10. Validate supplied HP and damage against the agreed numeric format and limits. Invalid entries leave the previous saved value intact; missing HP is valid.
- R7: HP updates use the same authorization as other encounter maintenance. Player screen sharing provides no separate editing access. As the existing UI is shared, displayed HP is visible to viewers unless a later visibility requirement changes that behavior.
- R8: Proposed initial behavior: reaching zero HP does not automatically remove a participant, skip its turn, or apply a condition. Any automated zero-HP behavior must be explicitly agreed.
- R9: The dungeon master can enter a damage amount for a participant with current HP. Applying it subtracts that amount from current HP and saves the result, including negative results. For example, 5 HP with 8 damage becomes -3 HP. Damage applies to the selected participant, not necessarily the active one.
- R10: Proposed missing-HP behavior: damage entry is unavailable until current HP is supplied for that participant. Do not silently treat missing HP as zero or introduce a separate accumulated-damage total. This does not block any encounter operation unrelated to HP.
- R11: Apply Unconscious automatically for HP strictly between -10 and 0 (-1 through -9 for whole-number HP). At HP <= -10, show the status alive adjacent instead of Unconscious. Preserve the actual HP value without clamping; do not substitute a Dead label. Missing HP and zero do not trigger these rules.
- R12: Wrap or visually surround the qualifying participant entry with a distinct color treatment and show the text Unconscious. Keep the active-turn indicator independently recognizable, including when the unconscious participant is active. Exact color is a presentation choice not yet specified.
- R13: Maintain Unconscious and alive adjacent status with saved encounter progress and restore the applicable label and any status color treatment when the encounter is re-entered. Preserve final HP and status for finished encounter viewing. A partial save must not restore mismatched HP and status.
- R14: Recalculate the HP-derived status on every saved HP change, including direct increases and damage. At HP <= -10 show alive adjacent; at -10 < HP < 0 show Unconscious; at HP >= 0 clear either HP-derived status and its associated color treatment. Replace the previous status rather than stacking both. Keep the active-turn indicator unchanged. Both statuses remain in the normal turn order. Next highlights them like any other participant; neither status automatically removes participants, skips turns, or advances the sequence.

## Acceptance criteria

- [ ] Given A, B, C in order with B Unconscious and C alive adjacent, Next from A highlights B, then C, then wraps to A and increments the counter normally.
- [ ] Applying damage that makes the active participant Unconscious or alive adjacent leaves it highlighted until an explicit turn-control action; no automatic skip occurs.
- [ ] Reopening preserves both statuses and their participants' positions in the normal turn sequence.

- [ ] The dungeon master can record HP for a PC, an NPC, and a mob and see each value on the correct encounter entry.
- [ ] A mob added during Fight can have its HP entered without an initiative requirement.
- [ ] Updating one of two same-name mobs changes only that mob's HP.
- [ ] HP can be updated for a non-active participant without changing order, active highlight, or Turn counter.
- [ ] Closing/reopening Janus restores saved HP along with the encounter's other saved progress.
- [ ] A finished encounter shows its final saved HP values and offers no HP editing controls.
- [ ] Invalid HP input is rejected without replacing the previous saved value.
- [ ] Unauthorized HP changes are denied, including direct requests.
- [ ] An HP update changes only the selected encounter participant and does not change campaign character information or another encounter's HP.
- [ ] A PC or NPC at -12 HP with alive adjacent in encounter A starts with unspecified HP and no inherited HP-derived status when selected for a new encounter B.
- [ ] Entering 20 HP for that character in encounter B and later reopening encounter A restores A's -12 HP and alive adjacent status, leaving B's 20 HP independent.
- [ ] Reopening an encounter with previously omitted HP keeps it unspecified and does not require entering a value to continue.
- [ ] Under the proposed zero-HP rule, reaching zero leaves encounter membership and turn progression unchanged.
- [ ] PCs, NPCs, and mobs can be added without HP, and an encounter with missing HP values can enter Fight and advance turns.
- [ ] An unspecified HP value remains unspecified after reopening Janus and is visually distinct from zero.
- [ ] A participant at 20 HP becomes 13 HP after applying 7 damage; applying another 3 damage produces 10 HP.
- [ ] Damage affects only the selected participant, including when same-name mobs exist or another participant is active.
- [ ] No maximum HP value is requested.
- [ ] Under the proposed missing-HP policy, a participant without HP cannot receive a damage subtraction until current HP is entered; the encounter can otherwise continue.
- [ ] Applying 8 damage to 5 HP results in -3 HP, applies Unconscious, and displays both its color treatment and text label.
- [ ] Closing and reopening that encounter restores -3 HP, the Unconscious status, and its color treatment without changing the order or active participant.
- [ ] Damage may take HP below -10, and the actual negative value is preserved. At -10 or below, the status is alive adjacent.
- [ ] A qualifying unconscious participant can still be visually distinguished as the active participant.
- [ ] Missing HP and HP equal to zero do not acquire Unconscious through the below-zero rule.
- [ ] Finished encounter viewing retains the final saved HP and status display without modification controls.
- [ ] HP at -1 and -9 produces Unconscious. Applying 1 damage at -9 produces -10 and replaces Unconscious with the exact label alive adjacent.
- [ ] Reopening an encounter with a participant at -10 restores both -10 HP and alive adjacent, without reverting to Unconscious.
- [ ] Applying 5 damage at -9 produces -14 HP and alive adjacent; reopening preserves -14 and that status.
- [ ] Applying 25 damage at 5 HP produces -20 HP and alive adjacent even though the value never stopped at -10.
- [ ] Raising HP from -14 to -5 replaces alive adjacent with Unconscious and its color treatment.
- [ ] Raising HP from -5 to 0 clears Unconscious and its color treatment while preserving any active-turn highlight.
- [ ] Raising HP directly from -14 to 5 clears alive adjacent without requiring an intermediate Unconscious state.
- [ ] Reopening after an HP increase restores the updated HP and resulting status or absence of status, without restoring a stale label or color.

## Validation

When implemented, exercise optional HP entry and damage subtraction across all participant categories, including duplicate-name mobs, non-active participants, and mobs added during Fight. Check negative-value persistence, Unconscious labeling and color, active-highlight coexistence, and restored status. Cover missing HP, 0, -1, -9, -10, -11, and -20, including damage that crosses directly from positive HP to below -10. Verify upward transitions from -14 to -5, -5 to 0, and directly from -14 to 5, including status/color restoration after reopening. No application code or executable tests exist yet.

## Open questions

- What numeric format and limits should HP and damage use? Proposed damage input is a nonnegative whole number; negative damage is not an implicit healing feature.
- Confirm that damage entry requires a supplied current HP value, while HP itself remains optional for encounter use.
- Confirm that zero HP causes no automatic removal, turn skipping, or conditions in this phase.

## Future enhancements

Statuses other than Unconscious and alive adjacent, and all spell effects, remain deferred. Their fields, durations, stacking, and interaction with turn progression will be specified separately if pursued.
