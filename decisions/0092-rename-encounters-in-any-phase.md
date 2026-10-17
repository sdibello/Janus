# 0092: Rename encounters in any phase

- Date: 2026-10-17
- Status: Accepted
- Related specs: [003: Encounters and participants](../specs/003-encounters-and-participants.md)
- Related decisions: [0091: Duplicate encounters from the campaign list](0091-duplicate-encounters-from-campaign-list.md)

## Context

Encounter duplication creates a useful starting copy, but dungeon masters may want to give that copy a descriptive name. Existing encounters also need correction or retitling after creation.

## Decision

Allow the dungeon master to edit the encounter name from its detail screen in Prepare, Fight, and Finished. Use an inline editor with Save and Cancel. Reject blank or whitespace-only names and trim surrounding whitespace on save. Finished remains view-only except for this metadata edit; all participant and fight state stays unchanged.

## Alternatives considered

- Allow renaming only during Prepare: would prevent correcting a name after an encounter has started or finished.
- Add a separate rename action to every campaign-list row: would clutter the list and duplicate functionality already available from encounter detail.

## Consequences

Encounter names remain easy to correct at any point in the workflow. Renaming uses the existing encounter revision to reject stale edits and appears in the campaign encounter list after save.
