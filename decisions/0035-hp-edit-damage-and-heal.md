# 0035: Direct HP editing, Damage, Heal, and status colors

- Status: Accepted
- Date: 2026-09-25
- Related spec: [007: Hit point tracking](../specs/007-hit-point-tracking.md)

## Context

The business review clarified how the dungeon master changes current HP, what happens when HP is missing, and when to settle status colors.

## Decision

- The dungeon master can directly edit current HP to any numeric value, positive or negative, with no application-defined range limit.
- Damage subtracts its entered amount from current HP. Heal adds its entered amount to current HP.
- Damage and Heal are unavailable until current HP is set. HP itself remains optional.
- Exact status colors will be decided during UI prototyping.

## Consequences

All HP changes recalculate HP-derived status and preserve the resulting value per encounter. The UI needs direct HP editing and separate Damage and Heal actions. Color selections remain a prototype decision.
