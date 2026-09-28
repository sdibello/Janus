# 0081: Put turn actions on the active card and simplify card controls

- Date: 2026-09-28
- Status: Accepted
- Related specs: [004: Initiative and turn sequence](../specs/004-initiative-and-turn-sequence.md), [005: Manual encounter ordering](../specs/005-manual-encounter-order.md), [007: Hit point tracking](../specs/007-hit-point-tracking.md)
- Updates: [0080](0080-keep-active-on-reorder-and-show-drop-slot.md) for keyboard reorder controls

## Context

Next and Skip sat above the participant list, away from the card whose turn they complete. Every card also showed Move up/down buttons even though drag-and-drop has a visible insertion arrow. The HP Save button was too far from the Current HP input and had a longer label than needed.

## Decision

Show Next and Skip only on the active participant's Fight card. Keep End encounter in the encounter header area. Remove Move up/down buttons from every card; preserve keyboard reordering by focusing a tile and using Alt+ArrowUp or Alt+ArrowDown. Place the HP Save button immediately after the Current HP input and label it **Save** in Prepare and Fight.

## Consequences

Turn actions remain attached to the active participant as turns advance. Drag-and-drop and the keyboard shortcut continue to use the same reorder API. HP behavior and authorization do not change.
