# 0016: Preserve negative HP and Unconscious status

- Date: 2026-09-25
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md)
- Supersedes: None; refines [0014](0014-hit-point-scope.md) and [0015](0015-optional-current-hp.md)
- Superseded by: None

## Context

The project owner confirmed that HP can go negative and must retain that value. The owner requested a colored participant treatment and Unconscious status when HP is "below 0, but not = -10", maintained when the encounter is re-entered.

## Decision

Preserve actual negative HP. Include automatic Unconscious status and a colored participant treatment for the specified negative-HP condition, restoring the status and display with encounter progress. This adds the specific Unconscious behavior to the current phase; other statuses and spell effects remain deferred.

[Decision 0017](0017-alive-adjacent.md) subsequently confirms Unconscious for -1 through -9 and alive adjacent at -10 or below, with automatic status updates as HP rises and clearing at zero or above. Both statuses remain in normal turn order without automatic skipping. No Dead status is established.

## Alternatives considered

- Clamping HP to zero: rejected by the explicit request to retain negative values.
- Losing status when reopening: inconsistent with the requested persistence.
- A full status/effect engine: beyond the requested addition.

## Consequences

Keep HP and status consistent on save and restore. Make the status color distinct from active-turn highlighting, with an explicit text label. Decision 0017 resolves the -10 boundary.
