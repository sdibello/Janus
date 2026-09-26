# 0022: Place new mobs before advancing

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q02 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner clarified that a mob added during Fight should be placed in its desired position before advancing the turn. Decision [0026](0026-add-participants-during-fight.md) further specifies that all participant categories are allowed and are initially inserted immediately before the active participant, after which the DM may drag them elsewhere.

## Decision

Leave the active participant highlighted when a mob is added. Next follows the ordinary current-order rule from decision 0021; there is no special turn handling for new mobs. The initial insertion position is specified by decision 0026.

## Alternatives considered

- Give new mobs an immediate turn or another special first-turn rule: unnecessary when the dungeon master controls placement before advancing.

## Consequences

Turn progression remains uniform. The dungeon master can add and place a mob, then continue with Next without a separate initiative or turn-resolution flow.
