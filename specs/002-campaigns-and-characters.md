# 002: Campaigns and character lists

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0003: Keep initial campaigns and character lists minimal](../decisions/0003-minimal-campaigns.md)
- Depends on: [001: Shared user identity and application access](001-shared-identity-and-access.md)

## Problem and intended outcome

Users need to create campaigns and maintain a list of player characters (PCs) and non-player characters (NPCs) for each campaign. Initial campaign information consists only of a name and creation date.

## Scope

Included: creating campaigns, viewing a user's campaigns, and adding, viewing, reclassifying, and removing entries in each campaign's PC and NPC lists. Character renaming, campaign renaming, archiving, and deletion are deferred beyond the current scope.

HP tracking is included through [spec 007](007-hit-point-tracking.md) at the encounter level. Campaign character records do not supply HP defaults or carry HP between encounters. Full character sheets, other statistics, game rules, session tracking, shared campaign editing, and campaign deletion are outside this draft. Unconscious and alive adjacent statuses are included under spec 007; other statuses and spell effects are deferred.

## Requirements

### Campaigns

- R1: A logged-in user can create a campaign by entering a nonblank name.
- R2: Janus records the date on which the campaign is created as its creation date. The date is assigned automatically and is not user-entered.
- R3: Campaign information consists of its name and creation date. Internal identifiers and ownership information may support persistence and access control without introducing additional user-entered campaign fields.
- R4: The user can list their campaigns and open an individual campaign to see its name, creation date, PCs, and NPCs. A newly created campaign has empty character lists and permits adding the first entry.
- R5: Campaigns and their character lists persist across logout and subsequent login.

### PCs and NPCs

- R6: The user can add a PC or NPC to a selected campaign with a nonblank name and classification of PC or NPC. Duplicate names are allowed. Each PC/NPC belongs to exactly one campaign and cannot be reused in another campaign. Optional current HP is entered separately for each encounter under spec 007; it is not maintained on the campaign character. No full character sheet is required.
- R7: The campaign view clearly distinguishes PCs from NPCs, whether displayed as separate lists or as a labeled combined list.
- R8: The user can maintain the lists by changing a character's PC/NPC classification and removing it. Character names cannot be changed in the current scope. An entry cannot be removed while it is included in any encounter; once it is no longer included in any encounter, it can be removed from the campaign.
- R9: Editing a character entry updates the existing entry rather than creating a duplicate. Changing its classification moves it to the appropriate list.
- R10: Removing an entry removes it from that campaign's list. Changes in one campaign must not alter another campaign's lists.

### Ownership and access

- R11: Campaign functionality uses the shared Janus identity and access capability described in spec 001.
- R12: The dungeon master is the initial authenticated user. Only the creating dungeon master can manage the campaign, its characters, and its encounters. Player-facing encounter viewing is covered separately in spec 006; collaborative editing is not required.
- R13: Access restrictions are enforced for direct requests as well as the user interface. Changing a campaign or character identifier must not allow access to another user's data.

## Acceptance criteria

- [ ] A logged-in user creates a campaign with a name and sees the saved name and automatically assigned creation date.
- [ ] A blank or whitespace-only campaign name is rejected without creating a campaign; duplicate campaign names are allowed.
- [ ] The user's campaign list includes the new campaign, which initially contains no PCs or NPCs.
- [ ] The user adds a named PC and a named NPC to a campaign and can distinguish them in the campaign view.
- [ ] A blank or whitespace-only character name is rejected without adding an entry; duplicate character names are allowed.
- [ ] Changing a PC to an NPC, or vice versa, updates its classification without duplication.
- [ ] Removing an entry makes it disappear from the selected campaign's list only when it is not included in any encounter; a referenced character cannot be removed.
- [ ] Adding, reclassifying, or removing an entry in one campaign leaves another campaign's lists unchanged.
- [ ] Campaign and character changes remain present after logout and login.
- [ ] Unauthenticated requests are denied, and a user other than the creating dungeon master cannot manage a campaign, its characters, or its encounters, including by supplying their identifiers.
- [ ] Adding or changing characters does not change the campaign's original creation date.

## Validation

When implementation exists, walk through campaign creation and the add/reclassify/remove character flow. Test persistence, empty lists, and blank-name validation. Use two campaigns and two user accounts to check campaign isolation and unauthorized direct requests.

The local foundation exists; campaign workflows and executable tests have not been implemented yet.

## Open questions
