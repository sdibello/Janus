# 0020: Increment the Round counter only on sequence wrap

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; confirms counter behavior left open by [0019](0019-active-after-reorder.md)
- Superseded by: None

## Context

The project owner confirmed that drag-and-drop reordering must not reset the counter, and clarified that the counter should only increment when Next wraps from the last participant to the first.

## Decision

Maintain a Round counter and increment it by exactly one only when the dungeon master clicks Next while the last participant is active, returning the sequence to the first participant. Decision [0025](0025-round-and-individual-turn-counters.md) adds an individual Turn counter for every participant, incremented on each Next click for the active participant. Reordering, inserting a participant, or manually setting any participant active changes neither counter.

## Alternatives considered

- Changing the Round counter whenever the active participant changes: inconsistent with counting completed list cycles.
- Resetting the counter as a side effect of drag-and-drop: explicitly rejected.

## Consequences

Keep Round and each participant's Turn counter independent from list order and manual active selection. In a one-participant encounter, each Next click increments that participant's Turn counter and wraps to the same participant, incrementing Round.
