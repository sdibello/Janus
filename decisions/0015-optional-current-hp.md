# 0015: Optional current HP and damage entry

- Date: 2026-09-25
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md)
- Supersedes: None; refines [0014](0014-hit-point-scope.md)
- Superseded by: None

## Context

The project owner selected current HP only, with damage entered and subtracted from that value, and clarified that HP is not required.

## Decision

Support a single optional current HP value for each PC, NPC, and mob. Do not require maximum HP. Applying damage subtracts the entered amount from current HP. Leaving HP unspecified must not prevent adding participants or preparing and running encounters.

[Decision 0016](0016-negative-hp-and-unconscious.md) confirms retaining negative values and adds persistent Unconscious status with its precise -10 boundary still open. Handling damage when current HP is missing remains proposed in spec 007. Other statuses and spell effects remain deferred.

## Alternatives considered

- Current and maximum HP fields: more than requested.
- Requiring HP before starting a fight: contrary to the explicit optionality requirement.

## Consequences

Distinguish missing HP from zero in storage and display. Save damage results as current HP with the encounter; neither a maximum-HP model nor a damage history is required by this decision.
