# 0034: No duplicate participants and deferred campaign maintenance

- Status: Partially superseded
- Date: 2026-09-25
- Related specs: [002: Campaigns and character lists](../specs/002-campaigns-and-characters.md), [003: Encounters and participants](../specs/003-encounters-and-participants.md)
- Superseded in part by: [0088](0088-campaign-character-renaming-and-prepare-badges.md) for PC/NPC renaming

## Context

The business review clarified repeated participants and whether campaign and encounter maintenance beyond the current needs should be included.

## Decision

- A PC/NPC can appear at most once in a given encounter.
- Multiple mobs of the same kind are separate individual entries, each with its own place in initiative and turn order. When the DM needs several, they create multiple entries during Prepare.
- Character, mob, campaign, and encounter renaming, plus archiving and deletion, were deferred at the time of this decision. PC/NPC renaming was later added under decision 0088.

## Consequences

Encounter participation must prevent adding the same campaign character twice. Mobs are not grouped into a shared turn or HP record. The current requirement set covers character list maintenance needed for play, while campaign and encounter lifecycle administration can be specified later.
