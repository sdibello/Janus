# 0014: Track HP now; defer status and spell effects

- Date: 2026-09-25
- Status: Accepted
- Related specs: [007: Hit point tracking](../specs/007-hit-point-tracking.md)
- Supersedes: None; expands the character scope of [0003](0003-minimal-campaigns.md)
- Superseded by: [0083](0083-encounter-conditions-and-layout.md) for the deferral of manual statuses; HP tracking and spell-effect deferral remain.

## Context

The project owner requested HP tracking for PCs, NPCs, and mobs, and explicitly deferred status and spell effects to the future.

## Decision

Include HP tracking for all three participant categories in the current phase. Keep status and spell effects outside this phase. [Decision 0015](0015-optional-current-hp.md) specifies optional current HP and damage subtraction. Carryover and automated zero-HP behavior remain open or proposed in spec 007.

Subsequent clarification: [decision 0016](0016-negative-hp-and-unconscious.md) adds the specific Unconscious status to this phase. Other statuses and spell effects remain deferred.

[Decision 0018](0018-encounter-specific-hp.md) resolves HP ownership: enter optional HP afresh for each encounter, preserve it on return to that encounter, and do not carry it between encounters.

## Alternatives considered

- Name-only participant records: insufficient for the requested HP tracking.
- Implementing status and spell effects alongside HP: beyond the requested phase.

## Consequences

Include saved HP in encounter resumption and finished encounter viewing. HP tracking does not require full character sheets or an automated combat rules engine.
