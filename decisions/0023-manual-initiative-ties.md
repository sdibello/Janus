# 0023: Resolve initiative ties during Prepare

- Date: 2026-09-25
- Status: Superseded
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q05 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: [0079](0079-alpha-encounter-workflow.md)

## Context

The project owner specified that ties in initiative are handled by the user during the Prepare phase.

## Decision

Initial ordering is highest initiative first. The dungeon master resolves equal initiatives by manually arranging the tied participants during Prepare. Preserve the resulting order when entering Fight; initiative does not re-sort the Fight list afterward.

## Alternatives considered

- Preserve the order participants were added: does not provide the requested user-controlled tie resolution.
- Resolve ties with an automatic roll: not requested.

## Consequences

The Prepare interface must let the dungeon master arrange participants with equal initiative before starting Fight. The resulting order is the starting Fight order and persists with the encounter.
