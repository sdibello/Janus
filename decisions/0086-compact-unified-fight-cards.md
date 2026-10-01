# 0086: Use compact, unified Fight cards

- Date: 2026-09-30
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: The active-card Actions area and separate Damage and Heal inputs in [0085](0085-non-active-fight-card-actions.md)
- Superseded by: None

## Context

Fight cards use different HP controls depending on which participant is active, and their padding and spacing make the turn order unnecessarily tall.

## Decision

Use the same HP controls on every Fight card. Current HP appears as a value label when set, with a small edit button that reveals its input and Save button; when HP is unset, the input and Save button are visible. Keep this control and one adjustment input with Damage and Heal on the HP row. Give Damage a light red background and Heal a light green background. Damage and Heal remain unavailable while current HP is unset; a successful adjustment clears its input. Next and Skip remain on the active card only. Place Set active and Hold directly before the status button in the heading, with Set active disabled for the active participant. Show a small PC, NPC, or Mob badge before the name and the muted individual count as **Turn:** beside it. Reduce card padding and the gap between cards.

## Alternatives considered

- Remove the direct Current HP editor: a participant entering Fight without HP would have no way to set it.
- Keep the active card's expanded Actions area: it would retain two layouts for the same HP operations.

## Consequences

All participants retain direct HP editing during Fight. HP arithmetic, encounter state, and permissions are unchanged; only the controls and spacing change.
