# 0093: Place inactive Fight HP controls beside the participant name

- Date: 2026-10-17
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: The non-active HP row placement in [0086](0086-compact-unified-fight-cards.md)
- Superseded by: [0095](0095-draggable-status-palette.md) for per-row Hold and status-picker controls
- Superseded by: [0097](0097-top-drop-activation-and-inline-fight-controls.md) for the active row and HP control order

## Context

The requested Fight layout places the HP editor and adjustment controls between a non-active participant's name and Set active button, with matching columns across participants of different name lengths.

## Decision

Use three aligned columns on non-active Fight cards: the type badge, name, and Turn count; the HP value/editor, adjustment input, Damage, Heal, and HP status; and Set active, Hold, and status controls. Use consistent column widths across cards, including separate aligned slots within the HP column for the value/editor and adjustment controls. Allow controls to wrap within their column; stack the three columns at the existing narrow-screen breakpoint. Keep the active participant's existing separate HP row and turn controls.

## Alternatives considered

- Move every Fight card's HP row into its heading: would also change the active participant's layout, outside the requested scope.
- Let each heading size its groups independently: HP and action controls would shift horizontally with each participant's name or HP editor.

## Consequences

Non-active cards align HP and action controls across rows, including when a name wraps or HP is being edited. Controls may wrap within their columns when space is limited. The same HP controls serve both layouts; arithmetic, saving, and availability remain unchanged. Prepare, Hold, and Finished layouts are unchanged.
