# 0098: Give Fight names more room and group statuses at the right

- Date: 2026-10-17
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Updates: [0097](0097-top-drop-activation-and-inline-fight-controls.md) for row proportions, HP control order, and active indication
- Updated by: [0099](0099-dnd35-condition-catalog-and-active-summary.md) for active turn-action placement

## Context

The DM requested removal of the Active turn bubble, more participant-name space, HP controls shifted farther right, a textbox immediately before Damage, and HP-derived statuses grouped with other statuses at the far right. The request's “UP column” is interpreted as the HP column, and “HP textbox” as the always-visible adjustment field.

## Decision

Remove the visual Active turn bubble. Preserve the active outline, active-only Next/Skip controls, and an accessible active-participant label with `aria-current`.

Allocate name, HP, and action/status groups in proportions 1.5:2:1, increasing the name area from about one quarter to one third of the row and moving HP controls right. Keep long-name ellipsis and full-name tooltips. In the HP group, order controls as current HP display/editor, adjustment textbox, Damage, Heal, so the adjustment input is directly before Damage. Preserve four-character field width, 30px control height, numeric validation, and save behavior.

Move Disabled, Dying, and alive adjacent bubbles out of the HP group into the right-aligned status/action group, alongside manual statuses. Keep their existing yellow, orange, and muted red colors. Put active turn actions before the status bubbles. Prepare and Finished remain unchanged.

## Alternatives considered

- Remove all active indication: would make it difficult to identify whose turn it is.
- Keep derived statuses below HP: would leave status information split across the row and consume vertical space.

## Consequences

Names have more room, and statuses share one location. Status rules, HP arithmetic, turn progression, order, drag behavior, and persistence are unchanged. Narrow screens retain stacked groups.
