# 0097: Activate by top drop and use compact inline Fight controls

- Date: 2026-10-17
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md), [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: No-drop-before-active rule in [0080](0080-keep-active-on-reorder-and-show-drop-slot.md), separate active HP row in [0093](0093-inactive-fight-hp-placement.md), and activation icon in [0096](0096-compact-adjustment-and-activation-controls.md)
- Updated by: [0098](0098-fight-name-space-and-status-alignment.md) for HP order, name space, status alignment, and active indication

## Context

The DM wants activation controls removed from every Fight card, activation by dragging above the current active participant, more compact HP controls beside every name, and names that truncate instead of wrapping.

## Decision

Offer an insertion slot above the first, active participant. Dropping a participant there moves it to the front and makes it active in one saved operation. Other drop slots preserve active selection. Releasing a held participant into the top slot also makes it active. A failed save changes neither saved order nor active selection. Round, individual Turn counts, HP, and existing completion flags are unchanged by reordering/activation; release retains its existing incomplete-for-this-Round rule. Remove all Set active buttons/icons. Alt+Home moves a focused Fight participant to the top and activates it; Alt+Up crossing into the first slot has the same effect.

Use the same heading layout for active and non-active Fight cards: name/Turn, HP controls, and applied-status/turn actions. Next and Skip remain exclusive to the active participant and sit in that heading. Order HP controls as adjustment textbox, current HP display/editor, Damage, Heal. The current HP control sits directly after the adjustment textbox. Keep the adjustment field at four visible characters; reduce adjustment input and Damage/Heal controls to 30px height. Preserve native form submission and existing arithmetic/validation.

Keep Fight participant names on one line, truncating with an ellipsis. A tooltip exposes the complete name; the underlying name and accessible text are unchanged. Apply the same truncation to compact held-name tiles. Narrow screens may stack the heading groups without horizontal page overflow.

## Alternatives considered

- Save order and active selection with separate requests: could leave only half of a top-drop operation applied after failure.
- Activate on every reorder: would alter the established behavior for other drop slots.
- Keep wider/taller active-card controls: would retain two layouts for the same HP operations.

## Consequences

The reorder and release requests gain an optional `makeActive` flag, defaulting to false for existing clients. Existing ownership, phase, revision, and order validation still applies; order and activation commit in the same transaction. No database migration is needed. Prepare and Finished layouts are unchanged.
