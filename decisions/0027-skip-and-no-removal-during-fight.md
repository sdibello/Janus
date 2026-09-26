# 0027: Skip turns without removing participants

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q09 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner requested two actions for the active participant: Next counts the turn and advances, while Skip advances without taking that turn. The owner also specified that participants cannot be removed during this phase.

## Decision

Next increments the active participant's individual Turn counter and advances to the next participant. Skip advances to the next participant without incrementing that participant's Turn counter. Neither action removes the participant. Participants cannot be removed during Fight.

Round increments only when Next completes the last participant's turn and wraps the active highlight to the first. Skip on the last participant wraps to the first without incrementing Round. This keeps the Round counter tied to completed turns through the full list.

## Alternatives considered

- Treat Skip like Next for individual turn counts: would count an explicitly skipped turn as taken.
- Remove skipped participants from the sequence: conflicts with the request that participants cannot be removed.

## Consequences

The UI needs distinct Next and Skip actions. Both move the active highlight; only Next records an individual turn, and only a Next wrap from the last entry increments Round.
