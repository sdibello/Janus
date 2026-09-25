# 002: Campaigns and character lists

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0003: Keep initial campaigns and character lists minimal](../decisions/0003-minimal-campaigns.md)
- Depends on: [001: Shared user identity and application access](001-shared-identity-and-access.md)

## Problem and intended outcome

Users need to create campaigns and maintain a list of player characters (PCs) and non-player characters (NPCs) for each campaign. Initial campaign information consists only of a name and creation date.

## Scope

Included: creating campaigns, viewing a user's campaigns, and adding, viewing, editing, and removing entries in each campaign's PC and NPC lists.

HP tracking is included through [spec 007](007-hit-point-tracking.md) at the encounter level. Campaign character records do not supply HP defaults or carry HP between encounters. Full character sheets, other statistics, game rules, session tracking, shared campaign editing, and campaign deletion are outside this draft. Unconscious and alive adjacent statuses are included under spec 007; other statuses and spell effects are deferred.

## Requirements

### Campaigns

- R1: A logged-in user can create a campaign by entering a nonblank name.
- R2: Janus assigns the creation date automatically when the campaign is created. This is a proposed default; the date is not a user-entered campaign field.
- R3: Campaign information consists of its name and creation date. Internal identifiers and ownership information may support persistence and access control without introducing additional user-entered campaign fields.
- R4: The user can list their campaigns and open an individual campaign to see its name, creation date, PCs, and NPCs. A newly created campaign has empty character lists and permits adding the first entry.
- R5: Campaigns and their character lists persist across logout and subsequent login.

### PCs and NPCs

- R6: The user can add a PC or NPC to a selected campaign with a proposed nonblank name and classification of PC or NPC. Optional current HP is entered separately for each encounter under spec 007; it is not maintained on the campaign character. No full character sheet is required.
- R7: The campaign view clearly distinguishes PCs from NPCs, whether displayed as separate lists or as a labeled combined list.
- R8: The user can maintain the lists by renaming entries, changing their PC/NPC classification, and removing entries from the campaign. These actions are the proposed interpretation of maintaining the lists.
- R9: Editing a character entry updates the existing entry rather than creating a duplicate. Changing its classification moves it to the appropriate list.
- R10: Removing an entry removes it from that campaign's list. Changes in one campaign must not alter another campaign's lists.

### Ownership and access

- R11: Campaign functionality uses the shared Janus identity and access capability described in spec 001.
- R12: The dungeon master is the initial authenticated user. Proposed ownership model: the creating dungeon master owns and maintains the campaign and its character lists. Player-facing encounter viewing is covered separately in spec 006; collaborative editing is not required.
- R13: Access restrictions are enforced for direct requests as well as the user interface. Changing a campaign or character identifier must not allow access to another user's data.

## Acceptance criteria

- [ ] A logged-in user creates a campaign with a name and sees the saved name and automatically assigned creation date.
- [ ] A blank or whitespace-only campaign name is rejected without creating a campaign.
- [ ] The user's campaign list includes the new campaign, which initially contains no PCs or NPCs.
- [ ] The user adds a named PC and a named NPC to a campaign and can distinguish them in the campaign view.
- [ ] A blank or whitespace-only character name is rejected without adding an entry.
- [ ] Renaming an entry preserves its campaign membership and does not add an extra entry.
- [ ] Changing a PC to an NPC, or vice versa, updates its classification without duplication.
- [ ] Removing an entry makes it disappear from the selected campaign's list.
- [ ] Adding, editing, or removing an entry in one campaign leaves another campaign's lists unchanged.
- [ ] Campaign and character changes remain present after logout and login.
- [ ] Unauthenticated requests are denied, and another user cannot read or modify a campaign or its entries by supplying their identifiers, under the proposed owner-only access model.
- [ ] Adding or changing characters does not change the campaign's original creation date.

## Validation

When implementation exists, walk through campaign creation and the full add/edit/reclassify/remove character flow. Test persistence, empty lists, and blank-name validation. Use two campaigns and two user accounts to check campaign isolation and unauthorized direct requests.

No application code or executable tests exist yet.

## Open questions

- Should a character be reusable across campaigns, or should entries belong only to their campaign? This draft does not require shared character records.
- Confirm automatic creation dates and the proposed restriction of campaign management to its creating dungeon master.
- Should campaign renaming, archiving, or deletion be included in a follow-up requirement?
- Are duplicate campaign or character names allowed? Internal identity should not depend on display-name uniqueness.
