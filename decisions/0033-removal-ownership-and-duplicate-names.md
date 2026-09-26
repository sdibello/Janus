# 0033: Character removal, management ownership, dates, and names

- Status: Accepted
- Date: 2026-09-25
- Related specs: [002: Campaigns and character lists](../specs/002-campaigns-and-characters.md), [003: Encounters and participants](../specs/003-encounters-and-participants.md)

## Context

The business review resolved campaign character removal, data management ownership, campaign creation dates, and duplicate naming.

## Decision

- A PC/NPC cannot be removed from its campaign while it is included in any encounter.
- Only the dungeon master who created a campaign can manage that campaign, its characters, and its encounters.
- A campaign's creation date is the date the campaign was created; Janus assigns it automatically.
- Duplicate campaign, encounter, PC/NPC, and mob names are allowed. Names must be nonblank.

## Consequences

Removal must check all encounters in the campaign that reference the character. Access checks apply to management actions even when a user submits a record identifier directly. Record identity must not rely on names being unique.
