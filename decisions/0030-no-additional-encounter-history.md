# 0030: Do not add encounter event history in this phase

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md)
- Supersedes: None; resolves Q12 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner confirmed that finished encounters do not need additional history at this time.

## Decision

Finished encounters retain and display their saved participants, final order, HP and status, Round, and individual Turn counts. Do not require a turn-by-turn action log or additional event history for this phase.

## Alternatives considered

- Add an audit/event history of every turn and change: unnecessary for the current requirements.

## Consequences

The existing saved encounter state is sufficient for viewing after completion. Additional history can be specified later if the workflow requires it.
