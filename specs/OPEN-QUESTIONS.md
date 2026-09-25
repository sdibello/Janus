# Requirements review: outstanding questions

Last reviewed: 2026-09-25.

Resume the business-analysis conversation here. Ask a few questions at a time, starting with Q01. Unchecked items are unresolved; suggested behaviors are proposals, not accepted decisions. When answered, update the related spec and decision record, then mark the item answered with a link to that record.

## Confirmed context: do not ask again

- Only the dungeon master logs in initially. Players watch the existing UI through external screen sharing. A separate presentation view is future work.
- Every encounter belongs to a campaign; its PCs/NPCs are selected from that campaign. Mobs exist only within their encounter.
- Prepare records initiative and sets initial order. Fight allows drag-and-drop ordering and adding mobs at any chosen position without initiative.
- Adding a participant does not change the active highlight. Moving the active participant prompts to keep it active, activate its former successor, or select another participant.
- Reopening restores saved encounter progress. Finished encounters remain viewable; their UI does not facilitate modification, but immutable storage is not required.
- HP is optional, current-only, entered separately for each encounter, and never carried between encounters. Returning to the same encounter restores its saved HP and status.
- Damage subtracts from HP, preserving negative values. HP strictly between -10 and 0 means Unconscious; HP at or below -10 means alive adjacent. Raising HP updates the status, clearing these statuses at zero or above. Statuses persist on return.
- Both statuses stay in normal turn order and are not skipped automatically. Other statuses and spell effects remain deferred.

## Turn flow and encounter lifecycle

Sources: [004](004-initiative-and-turn-sequence.md), [005](005-manual-encounter-order.md).

- [ ] **Q01 — Next after reordering:** Should Next always follow the selected active participant's position in the current list, even if someone acts twice or misses a turn before wraparound? Example: A, B, C with B active becomes A, C, B after moving C; should Next wrap to A even though C has not acted?
- [ ] **Q02 — New mob's first turn:** Should a mob first act when Next reaches its chosen position, waiting until the next cycle if inserted before the current participant? Should insertion leave the counter unchanged?
- [ ] **Q03 — Moving the active participant:** Should selecting who becomes active leave the counter unchanged? If the moved entry was last, should its former successor mean the former first entry? These are the remaining details of the already-approved three-choice prompt.
- [ ] **Q04 — Cancel or interruption:** Should canceling that prompt, or closing Janus before confirming it, restore the entire pre-move order and highlight? Proposed: hold the move pending and prevent Next until resolved.
- [ ] **Q05 — Initial order:** Confirm highest initiative first. For ties, preserve addition order, or let the DM resolve ties during Prepare?
- [ ] **Q06 — Initiative values:** Are whole numbers, including zero and negatives, appropriate? Are there business limits on the allowed range?
- [ ] **Q07 — Counter:** Confirm starting at 1 and retaining the final value for finished encounters. Should its UI label remain Turn or be Round? It counts list cycles, not individual participants.
- [ ] **Q08 — Adding PCs/NPCs during Fight:** Should this be allowed, using the same campaign selection and user-chosen placement as mobs?
- [ ] **Q09 — Removing participants during Fight:** Is removal allowed? If so, what happens when removing the active participant or the last remaining participant?
- [ ] **Q10 — Returning to Prepare:** Can an active Fight return to Prepare, or is that transition one-way? If allowed, define what happens to order and counter.
- [ ] **Q11 — Initiative visibility:** Keep original initiative visible during Fight as reference, or hide it?
- [ ] **Q12 — Finished encounter contents:** Are saved participants, final order, HP/status, and final counter sufficient for later viewing, or is additional history needed? A full action log has not been requested.
- [ ] **Q13 — Mistakes:** Is correcting an accidental Next click needed in the initial release? Undo is currently outside the draft scope.

## Campaigns and characters

Sources: [002](002-campaigns-and-characters.md), [003](003-encounters-and-participants.md).

- [ ] **Q14 — Character reuse:** Can one character record belong to multiple campaigns, or are character records campaign-specific? Encounter selection remains restricted to its own campaign either way.
- [ ] **Q15 — Character changes and history:** Should renamed/reclassified campaign characters update existing encounters or preserve the details recorded there? Removed campaign characters must not make finished encounter participants unavailable; how should they appear?
- [ ] **Q16 — Ownership:** Is only the creating DM allowed to manage each campaign and encounter? DM-only login is settled; access between different DM accounts is not.
- [ ] **Q17 — Creation date:** Confirm an automatically assigned campaign creation date, rather than a date the DM enters.
- [ ] **Q18 — Naming:** Is a required nonblank name sufficient for encounter metadata? Are duplicate campaign, encounter, and PC/NPC names allowed?
- [ ] **Q19 — Repeated participants:** Can the same PC/NPC appear more than once in an encounter? Should multiple same-name mobs always be individual entries with their own turns and optional HP, or are grouped mobs needed?
- [ ] **Q20 — Campaign maintenance:** Confirm renaming, reclassifying PC/NPC entries, and removing entries as list maintenance. Are campaign/encounter renaming, archiving, or deletion needed now? Any deletion rule must preserve the agreed ability to view finished encounters.

## HP and visual status

Source: [007](007-hit-point-tracking.md).

- [ ] **Q21 — Numeric input:** Are HP and damage whole numbers, with damage restricted to nonnegative amounts? Negative damage is not currently a healing feature. Are business limits needed?
- [ ] **Q22 — Missing HP:** When HP is blank, should damage entry be unavailable until the DM supplies current HP? This proposed rule does not prevent any other encounter action.
- [ ] **Q23 — Appearance:** Any preferred colors for Unconscious and alive adjacent? The active-turn highlight must remain separately recognizable, and status text should accompany color. Exact colors can be an implementation choice if there is no preference.

## Accounts and future applications

Source: [001](001-shared-identity-and-access.md).

- [ ] **Q24 — Sign-in and recovery:** Email, username, or either for login? Use email for password resets? Require email verification before first access?
- [ ] **Q25 — Registration and profile:** Open registration or invitation/approval? What profile fields are needed beyond the login identifier?
- [ ] **Q26 — Application meaning:** Are future applications separate products sharing accounts, or additional features inside Janus? Give an example to guide the integration boundary.
- [ ] **Q27 — Cross-application sessions:** Should one login carry across applications, and should logout affect just the current application or all applications?
- [ ] **Q28 — Access grants:** Do users automatically receive access to new applications, or does someone grant it? What roles/permissions are needed, and who manages grants?
- [ ] **Q29 — Password/session behavior:** Confirm password reset signs out all existing sessions, while password change signs out other sessions and renews the current one. Any user-facing preferences for session duration or reset-link expiry?

## Release expectations and implementation follow-up

These came from the broader review or remain implementation choices; they are not extra accepted product requirements.

- [ ] **Q30 — Devices and connectivity:** Desktop, tablet, or phone first? Must Janus work without internet? Reopening saved encounters is settled; offline use is not.
- [ ] **Q31 — Release scope:** Are the documented features the first usable release, or is any subset the priority?
- [ ] **T01 — Technical choices:** Select the stack, hosting/deployment model, identity provider/library, and integration protocol once product needs are clear. No specific technology has been selected.
- [ ] **T02 — Security configuration:** Define password policy, session/reset expiry, and abuse controls using the chosen identity implementation. Separate technical defaults from user-facing decisions in Q29.

## Review housekeeping

This consolidated list removes duplicates and does not reopen confirmed answers. Spec 007 still contains a proposed zero-HP wording and an open question about conditions/skipping at zero. Its settled rules now clear HP-derived status at zero and keep participants in normal turn order; reconcile that wording during the next spec cleanup rather than asking the same question again.

All specs remain Draft. Prior accepted product decisions still apply; proposed edge cases must not be treated as approved merely because they appear in an acceptance example. No implementation or executable tests exist yet.
