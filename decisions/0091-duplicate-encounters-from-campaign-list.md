# 0091: Duplicate encounters from the campaign list

- Date: 2026-10-17
- Status: Accepted
- Related specs: [003: Encounters and participants](../specs/003-encounters-and-participants.md)
- Related decisions: [0030: No additional encounter history](0030-no-additional-encounter-history.md), [0079: Alpha encounter workflow](0079-alpha-encounter-workflow.md)

## Context

Dungeon masters may want to reuse a participant setup from an encounter that is being prepared, is in progress, or has finished. The campaign encounter list groups all three phases and is the natural place to start a copy.

## Decision

Show a **Duplicate** action beside each encounter in the campaign list, including the collapsed Finished group. Duplicating any phase creates and opens a new editable Prepare encounter named `Copy of [source name]`. Copy campaign character references and mob names only. Start with fresh participant identities and positions sorted by participant name; do not copy initiative, HP, Hold state, conditions, Round or Turn progress, active selection, or encounter history.

## Alternatives considered

- Copy only Prepare encounters: does not let users reuse a participant list from a finished or active encounter.
- Preserve the participant's Fight order: risks carrying an old initiative-derived order into a new encounter.
- Copy HP or other encounter state: blurs the line between reusing a roster and resuming an old encounter.

## Consequences

The source encounter is unchanged, and the duplicate is a new independent Prepare encounter that can be edited before Fight. Campaign character references continue to use their current campaign values; encounter-local mobs are new entries. Duplicate names are allowed, so repeated copies of one source share the suggested name.
