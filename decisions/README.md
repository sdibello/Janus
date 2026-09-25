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
| [0012](0012-active-participant-selection.md) | Accepted | Additions preserve the highlight; moving the active entry prompts for who stays or becomes active. |
| [0013](0013-resume-encounters.md) | Accepted | Restore saved encounter phase, participants, order, active highlight, and counter when Janus reopens. |
| [0014](0014-hit-point-scope.md) | Accepted | Track HP for all participant categories now; status and spell effects are future work. |
| [0015](0015-optional-current-hp.md) | Accepted | HP is optional and current-only; entered damage subtracts from it. |
| [0016](0016-negative-hp-and-unconscious.md) | Accepted | Preserve negative HP and status on reopening; boundary clarified by 0017. |
| [0017](0017-alive-adjacent.md) | Accepted | HP changes update status: Unconscious at -1 through -9, alive adjacent at -10 or below, neither at zero or above. |
| [0018](0018-encounter-specific-hp.md) | Accepted | Enter HP separately per encounter; restore it on return without carrying it between encounters. |
