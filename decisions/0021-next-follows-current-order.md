# 0021: Next follows the current participant order

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q01 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner simplified Next behavior: it should always advance to the next participant in the current order. The existing control to set any participant active handles cases where the dungeon master wants a different participant to act.

## Decision

On Next, move to the participant immediately after the active participant in the current list. At the end of the list, wrap to the first participant and increment Turn as established by decision 0020. Do not account for whether participants have acted during a cycle and do not introduce special cases because of reordering. The dungeon master can set any participant active when needed.

## Alternatives considered

- Track participants who have or have not acted in the current cycle: adds turn logic beyond the requested simple ordered progression.
- Alter Next to compensate for reorders: conflicts with the request that Next always follows current order.

## Consequences

Next behavior depends only on the current ordered list and active participant. A participant may repeat or be skipped during a cycle after a reorder; the DM can correct the sequence with the set-active control.
