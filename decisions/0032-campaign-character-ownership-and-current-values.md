# 0032: Campaign character ownership and current encounter values

- Status: Accepted
- Date: 2026-09-25
- Related specs: [002: Campaigns and character lists](../specs/002-campaigns-and-characters.md), [003: Encounters and participants](../specs/003-encounters-and-participants.md)

## Context

The business review asked whether PCs/NPCs could be reused between campaigns and whether encounters should preserve character details as they were when added.

## Decision

- Each PC/NPC belongs to exactly one campaign and cannot be reused in another campaign.
- Encounters refer to their campaign's PC/NPC entries and display their current values. Editing a character updates its display in every encounter that includes it; no historical character snapshot is kept.
- HP and status remain specific to each encounter and are not campaign character values.
- Removing a campaign character must not make a finished encounter unavailable. What happens to that participant entry when the character is removed remains open.

## Consequences

Encounter records need to retain a reference to campaign characters, while HP and status are stored on encounter participation. Removal behavior must be decided before implementing that operation for characters referenced by encounters.
