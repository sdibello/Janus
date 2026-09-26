# 0029: Keep initiative values visible during the encounter

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; resolves Q11 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner confirmed that initiative can remain displayed throughout the current phase.

## Decision

Display participants' recorded initiative values during both Prepare and Fight. Initiative sets the initial order in Prepare and remains informational during Fight; manual order controls turn progression. Participants added during Fight do not require initiative, and have no initiative value to display unless one was entered.

## Alternatives considered

- Hide initiative after Fight begins: unnecessary for the current phase.

## Consequences

Keep recorded initiative visible after manual reordering without using it to re-sort participants. A missing initiative value for a Fight addition must not prevent the participant from being added or used.
