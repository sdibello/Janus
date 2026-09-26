# 0028: Do not return an encounter to Prepare

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md)
- Supersedes: None; resolves Q10 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner specified that a Fight cannot return to Prepare once it has started.

## Decision

Prepare transitions to Fight once. Fight cannot transition back to Prepare. Ending Fight moves the encounter to Finished, which remains viewable under the existing requirements.

## Alternatives considered

- Reopen Prepare to revise initiative after Fight starts: explicitly disallowed for this phase.

## Consequences

The UI does not offer a return-to-Prepare action during Fight. Initiative preparation is complete when Fight begins; subsequent order changes use the Fight controls.
