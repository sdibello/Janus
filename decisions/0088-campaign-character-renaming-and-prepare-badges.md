# 0088: Rename campaign characters and reuse participant badges in Prepare

- Date: 2026-09-30
- Status: Accepted
- Related specs: [002](../specs/002-campaigns-and-characters.md), [003](../specs/003-encounters-and-participants.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: The PC/NPC renaming deferral in [0034](0034-no-duplicate-participants-and-deferred-maintenance.md)
- Superseded by: None

## Context

PC and NPC names can contain typos, but the campaign page has no correction control. Prepare rows use separate type text while Fight cards have compact colored type badges.

## Decision

Allow the owning dungeon master to edit the name of an existing campaign PC or NPC in place. Trim and reject blank names, and continue allowing duplicate names. Keep the same character ID and classification so linked encounters show the corrected current name. In active and held Prepare rows, show the Fight PC, NPC, or Mob badge before the name and remove the separate type text.

## Consequences

Renaming does not require a database migration or change encounter membership, HP, order, or counters. Historical encounters display the corrected current campaign character name, consistent with decision 0032. Mob renaming remains outside this change.
