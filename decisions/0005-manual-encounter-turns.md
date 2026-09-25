# 0005: Advance encounter turns manually

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004: Initiative and turn sequence](../specs/004-initiative-and-turn-sequence.md)
- Supersedes: None
- Superseded by: None

## Context

The project owner requested starting an encounter by entering initiative for every PC, NPC, and mob, highlighting each in initiative order, and advancing when the user clicks Next.

## Decision

Highlight one participant at a time and advance only on the user's Next action. After the final participant, return to the beginning and increment the displayed Turn counter once per full cycle. Provide End encounter to stop the sequence.

Initial ordering direction, tie handling, the initial counter value, persistence of running state, and participant additions/removals remain proposals or open questions in the draft spec. [Decision 0006](0006-initial-initiative-only.md) clarifies that initiative sets only the original order and that manual ordering controls the running sequence.

## Alternatives considered

- Automatically advancing on a timer: inconsistent with the requested manual control.
- Incrementing the Turn counter on every participant change: inconsistent with the requested increment after the full list completes.

## Consequences

The interface must distinguish the active participant from the full-cycle counter. All participant categories take part in the same sequence, and the user controls its pace and termination.
