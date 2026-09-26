# 0031: Do not provide a Back button in this phase

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q13 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner deferred correcting an accidental Next action using a Back button.

## Decision

Do not provide a Back or undo-turn button in this phase. If the wrong participant is active, the DM can use the existing set-active control to choose the intended participant. Do not automatically decrement Round or individual Turn counters when manually changing the active participant.

## Alternatives considered

- Add turn history and undo: deferred from the current scope.

## Consequences

Turn progression remains simple, with Next and Skip moving forward. Manual active selection corrects who acts next without attempting to reverse recorded counters.
