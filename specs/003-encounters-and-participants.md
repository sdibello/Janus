# 003: Encounters and participants

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0004: Store mobs within their encounter](../decisions/0004-encounter-local-mobs.md)
- Clarifying decision: [0009: Campaign encounters and retained history](../decisions/0009-campaign-encounters-and-history.md)
- Related specs: [001: Shared identity and access](001-shared-identity-and-access.md), [002: Campaigns and character lists](002-campaigns-and-characters.md)

## Problem and intended outcome

Users need to create encounters and add player characters (PCs), non-player characters (NPCs), and mobs to them. Mobs only need to be saved as part of the encounter, without requiring reusable character records or a separate mob library.

## Scope

Included: creating and reopening encounters, adding PCs, NPCs, and mobs, viewing participants, and maintaining encounter membership. Encounter renaming, archiving, and deletion are deferred beyond the current scope.

Every encounter belongs to a campaign. Included are mob additions during play and later viewing of finished encounters. Initiative and turn sequencing are covered in [spec 004](004-initiative-and-turn-sequence.md), and HP tracking in [spec 007](007-hit-point-tracking.md). Automated combat rules, reusable mob templates, and encounter deletion are outside this draft. Unconscious and alive adjacent statuses are included under spec 007; other statuses and spell effects are deferred.

## Requirements

### Encounter creation

- R1: A logged-in dungeon master can create an encounter within a campaign they manage and reopen it later with its saved participants. Every encounter belongs to exactly one campaign; standalone encounters are not supported.
- R2: Minimum encounter information is a nonblank name. Duplicate encounter names are allowed. Additional fields are not required by this draft.
- R3: An encounter can initially be empty and can contain any combination of PCs, NPCs, and mobs; none of these participant categories is mandatory.

### PCs and NPCs

- R4: PCs and NPCs must be selected from the encounter's own campaign list defined in spec 002. The dungeon master can add them during preparation or at any time during Fight. Characters from another campaign cannot be added, even if the same dungeon master owns both campaigns. Validate campaign membership on direct requests as well as in the UI.
- R5: A PC or NPC can be added at most once to a given encounter. Adding it does not remove it from its campaign list. Removing it from an encounter removes only its encounter membership, not the character from the campaign or other encounters.
- R6: A PC or NPC may participate in multiple encounters. Changes to membership in one encounter do not change another encounter's membership.
- R7: Encounters display the current values of their referenced campaign PCs/NPCs. Editing a campaign character updates its displayed values in every encounter that includes it; encounter-specific HP and status remain separate under spec 007. No historical character snapshot is kept. A campaign character cannot be removed while it is included in any encounter.

### Mobs

- R8: The dungeon master can add mobs directly within an encounter during Prepare or Fight, without a separate campaign or global mob record. Each mob is an individual entry; when multiple of the same kind are needed, create multiple entries during Prepare. In Prepare, initiative determines initial order. In Fight, insert the mob immediately before the active participant without initiative entry; the dungeon master can then reorder it before advancing, as specified in specs 004 and 005. "Monster" and "mob" refer to the same participant category here. Minimum identifying information is a nonblank name under decision 0033. Optional current HP tracking is supported under spec 007; entering HP is not required. Other statistics remain unspecified. The finished-encounter UI does not offer mob addition or other modification controls.
- R9: Mobs persist with the encounter and remain available when the user reopens it, including after logout and login. Encounter-only storage does not mean temporary or session-only storage.
- R10: Creating a mob does not add a PC or NPC to the campaign list and does not require creating a record in a reusable mob catalog.
- R11: Each mob entry belongs to its encounter. Editing or removing a mob affects only that encounter and does not affect mobs or characters in another encounter.
- R12: The user can remove individual mob entries during Prepare only; participants cannot be removed during Fight under decision 0027. Mob names cannot be changed in the current scope. Multiple mobs with the same name are allowed and addressed individually, so removing one does not remove the others.

### Participant view and access

- R13: The encounter view clearly identifies each participant as a PC, NPC, or mob. Duplicate participant names are allowed; individual entries are distinguished by identity and position in the encounter. Participant maintenance controls apply only to unfinished encounters.
- R14: Encounter management uses the shared Janus identity and access capability. The initial authenticated operator is the dungeon master; management access is restricted to the dungeon master who created the campaign. Players watch the existing UI through external screen sharing as specified in spec 006; no direct player access is required in this phase.
- R15: Direct requests enforce the same access rules as the UI. Users cannot access another user's encounters or add characters they are not authorized to access by supplying identifiers.

### Finished encounters

- R16: The campaign provides a way to list and open its finished encounters. Ending an encounter does not remove it from the campaign or make it inaccessible.
- R17: Finished encounters remain saved and viewable after navigation, logout, and subsequent login, with no automatic expiration as part of this workflow. Preserve their participant lists, including encounter-local mobs.
- R18: Opening a finished encounter for viewing does not restart it or advance the sequence. Display the saved participants, final participant order, HP and status, Round counter, and individual Turn counters. No additional event history or turn-by-turn action log is required in this phase.
- R19: The finished-encounter UI facilitates viewing only: no editing fields, add/remove controls, drag-and-drop ordering, Next, or restart controls. This is a UI requirement, not a requirement for immutable storage or a blanket prohibition on authorized backend corrections. It does not require building a correction API or administrative editor; ordinary authorization still applies.

## Acceptance criteria

- [ ] A logged-in dungeon master creates a named encounter in a campaign, which initially has no participants, and can reopen it from that campaign.
- [ ] Creation without a valid accessible campaign is rejected.
- [ ] The PC/NPC selector offers only that campaign's characters during Prepare and Fight; a direct request to add a character from another campaign is rejected even when both campaigns have the same owner.
- [ ] A blank or whitespace-only encounter name is rejected under the accepted naming requirement.
- [ ] The user adds a PC, an NPC, and a mob and sees each participant's category.
- [ ] An encounter can be saved with no participants, or with only one participant category.
- [ ] Adding or removing a PC or NPC leaves its campaign record and membership in other encounters unchanged.
- [ ] A PC or NPC can appear in two encounters independently.
- [ ] Adding a mob requires no campaign character record or reusable mob catalog entry and leaves campaign PC/NPC lists unchanged.
- [ ] Saved mobs and other participant memberships remain present after closing the encounter, logging out, logging in, and reopening it.
- [ ] Removing a mob changes only the selected encounter entry.
- [ ] Two mobs with the same name can coexist; removing one leaves the other intact.
- [ ] A blank or whitespace-only mob name is rejected under the accepted naming requirement.
- [ ] Unauthorized encounter reads, changes, and additions of inaccessible characters are denied, including direct requests.
- [ ] A mob can be added while the encounter is active, remains local to that encounter, and is saved with it without rebuilding the initial initiative order.
- [ ] During Fight, the dungeon master can add a PC or NPC from the campaign as well as a mob at any time.
- [ ] After ending an encounter and logging out and back in, the dungeon master can find it in its campaign and view its participants, including mobs.
- [ ] Viewing a finished encounter leaves it ended and does not advance its sequence.
- [ ] The finished-encounter view offers no participant, order, or encounter modification controls. Verification does not require the underlying record to be immutable.
- [ ] Removing a campaign character referenced by a finished encounter is rejected; the character and encounter remain available.

## Validation

When implementation exists, create two encounters and add the same PC and NPC to both, verifying that neither can be added twice to one encounter. Add multiple same-name mobs during Prepare and verify that each has its own turn and HP. Reopen both after logout and login to verify persistence. Remove participants during Prepare to verify that campaign lists and the other encounter remain unchanged.

Use a second campaign owned by the same dungeon master to verify rejection of cross-campaign character selection, and a second user account to validate unauthorized access. Add a mob during play, finish the encounter, log out, and reopen it through its campaign. Verify that removing a referenced campaign character is rejected, including when referenced only by a finished encounter. Encounters display current campaign character values under decision 0032. Windows API smoke checks now cover creation, campaign selection, local mobs, Fight additions, finished viewing, cross-campaign rejection, and owner isolation. Browser and restart checks remain.

## Open questions

None from the completed review. Decisions 0022, 0026, 0030, 0033, and 0034 resolve insertion, history, ownership, removal, naming, and duplicate participation.
