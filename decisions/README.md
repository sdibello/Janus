# Decision records

Keep durable product, design, technical, and workflow decisions here so their reasons survive beyond a conversation.

Copy TEMPLATE.md to NNNN-short-title.md using the next available number. Mark tentative choices Proposed and made choices Accepted. Include context, alternatives, consequences, and related specs.

When a decision changes, add a new record and mark the old one Superseded with a link to its replacement. Preserve the history. Add each record to this index.

| Record | Status | Summary |
| --- | --- | --- |
| [0001](0001-project-documentation.md) | Accepted | Keep shared AI guidance, specs, and decisions in the repository. |
| [0002](0002-shared-identity-and-access.md) | Accepted | Reuse identity and access across applications; no initial multifactor requirement. |
| [0003](0003-minimal-campaigns.md) | Accepted | Campaigns start with a name, creation date, and PC/NPC lists. |
| [0004](0004-encounter-local-mobs.md) | Accepted | Encounters support PCs, NPCs, and encounter-local mobs. |
| [0005](0005-manual-encounter-turns.md) | Accepted | Advance participants with Next and increment Turn on wraparound; ordering refined by 0006. |
| [0006](0006-initial-initiative-only.md) | Accepted | Initiative sets the original order; drag and drop controls order while running. |
| [0007](0007-dm-login-and-player-display.md) | Accepted | Only the dungeon master logs in initially; support player viewing during play. |
| [0008](0008-screen-sharing-only.md) | Accepted | Use screen sharing this phase; a separate presentation view is a possible future enhancement. |
| [0009](0009-campaign-encounters-and-history.md) | Accepted | Require campaign encounters, allow mobs during play, and retain finished encounters for viewing. |
| [0010](0010-mob-initiative-and-finished-ui.md) | Superseded | Replaced by 0011: phase-specific mob placement; finished UI behavior retained. |
| [0011](0011-prepare-and-fight.md) | Accepted | Prepare sets initiative order; Fight allows manual ordering and mob placement anywhere. |
| [0012](0012-active-participant-selection.md) | Superseded | Replaced by 0019: active selection follows the pre-reorder list. |
| [0013](0013-resume-encounters.md) | Accepted | Restore saved encounter phase, participants, order, active highlight, and counter when Janus reopens. |
| [0014](0014-hit-point-scope.md) | Accepted | Track HP for all participant categories now; status and spell effects are future work. |
| [0015](0015-optional-current-hp.md) | Accepted | HP is optional and current-only; entered damage subtracts from it. |
| [0016](0016-negative-hp-and-unconscious.md) | Accepted | Preserve negative HP and status on reopening; boundary clarified by 0017. |
| [0017](0017-alive-adjacent.md) | Accepted | HP changes update status: Unconscious at -1 through -9, alive adjacent at -10 or below, neither at zero or above. |
| [0018](0018-encounter-specific-hp.md) | Accepted | Enter HP separately per encounter; restore it on return without carrying it between encounters. |
| [0019](0019-active-after-reorder.md) | Accepted | Reorder selects the pre-reorder successor; the DM can set any participant active. |
| [0020](0020-turn-counter-wrap-only.md) | Accepted | Only Next wrapping from last to first increments Round; see 0025 for individual Turn counters. |
| [0021](0021-next-follows-current-order.md) | Accepted | Next always advances in current order; use set-active for exceptions. |
| [0022](0022-place-new-mobs-before-advancing.md) | Accepted | Place new mobs before Next; they use the normal current-order sequence. |
| [0023](0023-manual-initiative-ties.md) | Accepted | DM manually resolves equal initiative order during Prepare. |
| [0024](0024-unbounded-whole-number-initiative.md) | Accepted | Initiative is any whole number, including positive, negative, and zero, without an app-defined range. |
| [0025](0025-round-and-individual-turn-counters.md) | Accepted | Track each participant's turns separately from the Round counter. |
| [0026](0026-add-participants-during-fight.md) | Accepted | Add any participant during Fight immediately before active; then allow reordering. |
| [0027](0027-skip-and-no-removal-during-fight.md) | Accepted | Next counts an individual turn; Skip advances without counting; no Fight removals. |
| [0028](0028-fight-transition-is-one-way.md) | Accepted | Once Fight starts, the encounter cannot return to Prepare. |
| [0029](0029-display-initiative-values.md) | Accepted | Keep recorded initiative visible during Prepare and Fight; it does not govern Fight order. |
| [0030](0030-no-additional-encounter-history.md) | Accepted | Finished encounters show saved state and final counts; no event history is needed now. |
| [0031](0031-no-back-button.md) | Accepted | No Back/undo-turn control; use set-active to correct who acts next. |
| [0032](0032-campaign-character-ownership-and-current-values.md) | Accepted | PCs/NPCs belong to one campaign; encounters display current character values rather than snapshots. |
| [0033](0033-removal-ownership-and-duplicate-names.md) | Accepted | Block removal of referenced characters; restrict management to the creating DM; allow duplicate names. |
| [0034](0034-no-duplicate-participants-and-deferred-maintenance.md) | Accepted | No repeated PC/NPCs in encounters; multiple mobs are individual entries; defer rename/archive/delete. |
| [0035](0035-hp-edit-damage-and-heal.md) | Accepted | Set HP directly; Damage subtracts, Heal adds; both need current HP; decide status colors in prototyping. |
| [0036](0036-username-email-and-verification.md) | Accepted | Sign in with username or email; use email for resets and require verification before access. |
| [0037](0037-invitation-only-registration.md) | Accepted | New users need an invitation to create an account; open registration is disabled. |
