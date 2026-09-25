# 0004: Store mobs within their encounter

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003: Encounters and participants](../specs/003-encounters-and-participants.md)
- Supersedes: None
- Superseded by: None

## Context

The project owner requested encounters containing PCs, NPCs, and mobs, with mobs needing to be saved only within the encounter.

## Decision

Support all three participant categories. Persist mobs as part of their encounter without requiring reusable mob records outside that encounter or adding mobs to campaign PC/NPC lists.

This is a data-lifecycle requirement, not a choice of database schema. Encounter fields, campaign association, character-reference behavior, and access defaults remain proposals or open questions in the linked draft.

## Alternatives considered

- Requiring a persistent, reusable mob library: unnecessary for the requested scope.
- Keeping mobs only for the current session: would not preserve them as part of the saved encounter.

## Consequences

Users can add mobs directly to an encounter without maintaining a separate catalog. Mob edits and removals remain local to the encounter. Reusable templates or copying mobs between encounters can be specified later if needed.
