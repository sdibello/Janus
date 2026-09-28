# 0082: Align Damage and Heal controls with Current HP

- Date: 2026-09-28
- Status: Accepted
- Related spec: [007: Hit point tracking](../specs/007-hit-point-tracking.md)
- Follows: [0081: Active card actions and HP Save layout](0081-active-card-actions-and-hp-save-layout.md)

## Context

Current HP has its label above the input and a Save button immediately beside the input. Damage amount and Heal amount still use a different layout, making the three HP actions harder to scan within a Fight card.

## Decision

Use the same field-and-button layout for all three HP actions. Place the Damage amount and Heal amount labels above their text boxes, with Damage and Heal buttons immediately beside the corresponding text boxes. Keep Damage and Heal available only during Fight when current HP exists.

## Consequences

All HP actions have a consistent layout. HP arithmetic, persistence, authorization, and status rules remain unchanged.
