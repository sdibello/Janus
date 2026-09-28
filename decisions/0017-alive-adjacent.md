# 0017: Unconscious range and alive adjacent at -10 or below

- Date: 2026-09-25
- Status: Superseded by [0083](0083-encounter-conditions-and-layout.md) for HP-derived labels
- Related specs: [007](../specs/007-hit-point-tracking.md)
- Supersedes: None; refines [0016](0016-negative-hp-and-unconscious.md)
- Superseded by: [0083](0083-encounter-conditions-and-layout.md); the alive adjacent boundary and negative HP persistence remain.

## Context

The project owner confirmed Unconscious for -1 through -9 HP, specified the label alive adjacent at -10, and subsequently confirmed that it also applies to all HP below -10.

## Decision

Apply Unconscious for -10 < HP < 0. At HP <= -10, apply alive adjacent instead. Retain the actual negative HP and applicable status when reopening the encounter, without clamping HP to -10.

The project owner subsequently confirmed that raising HP updates the status automatically. Recalculate on each saved HP change: HP <= -10 is alive adjacent, -10 < HP < 0 is Unconscious, and HP >= 0 clears these HP-derived statuses and their associated color treatment. Preserve the active-turn highlight and save the updated state for reopening.

No Dead status is implied. Any additional color treatment for alive adjacent remains unspecified.

The project owner confirmed that both Unconscious and alive adjacent participants remain in the turn order. Next visits them normally; neither status causes automatic removal, skipping, or advancement.

## Alternatives considered

- Unconscious at -10: inconsistent with the specified boundary and label.
- Automatically labeling -10 as Dead: not the requested terminology.

## Consequences

Validate the change from -9 to -10, further damage below -10, and damage that jumps directly to below -10. Preserve the actual HP and alive adjacent label on reopening.
