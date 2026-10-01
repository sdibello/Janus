# 0085: Show direct actions on non-active Fight cards

- Date: 2026-09-30
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: The inactive Manage control in spec 008 and the two-input Fight layout in spec 007 for non-active participants
- Superseded by: [0086](0086-compact-unified-fight-cards.md) for the active-card and control-placement rules

## Context

The dungeon master needs to adjust HP and select or hold a non-active participant without expanding a card.

## Decision

Show one HP adjustment input with adjacent Damage and Heal buttons on each non-active Fight card. Damage subtracts and Heal adds the entered amount; clear the input after a successful save. Keep both buttons unavailable until current HP is set. Place Set active and Hold on the right of the same row. Keep the active card's Actions area and HP controls. In Fight, show the individual Turn count in muted text immediately after the participant name.

## Alternatives considered

- Keep inactive Actions collapsed: requires an extra step for common actions.
- Keep separate Damage and Heal inputs: duplicates the amount field on a card that only needs one adjustment at a time.

## Consequences

The card layout changes without changing HP arithmetic, persistence, or the turn sequence. The active participant can still set or edit current HP directly.
