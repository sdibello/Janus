# 0025: Track rounds and participant turns separately

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; refines [0020](0020-turn-counter-wrap-only.md)
- Superseded by: None

## Context

The project owner split the previous single counter into a Round counter and an individual Turn counter for each PC, NPC, and mob. Round tracks full cycles. Individual counters track each participant's turns.

## Decision

Maintain a Round counter that increments only when Next moves from the last participant to the first. Maintain an individual Turn counter for every participant, incrementing the active participant's counter on each Next click. Reordering, adding a participant, and manually changing who is active do not change the counters.

The project owner confirmed initial values of Round 1 and individual Turns 0, and confirmed that finished encounters retain and display final counts. The active participant whose counter increments on Next follows from the current highlight.

## Alternatives considered

- One counter for both full rounds and individual turns: cannot express each requested count separately.
- Incrementing individual counters on manual active selection: that action changes selection, not a completed turn.

## Consequences

Save and restore Round and every participant's Turn counter with the encounter. New participants begin with an individual Turn count of zero.
