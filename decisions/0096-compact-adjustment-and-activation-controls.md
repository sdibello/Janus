# 0096: Compact Fight HP adjustment and activation controls

- Date: 2026-10-17
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: Disabled Set active on the active participant and text-labeled activation controls in [0086](0086-compact-unified-fight-cards.md)
- Superseded by: [0097](0097-top-drop-activation-and-inline-fight-controls.md) for activation controls and compact control height

## Context

The requested Fight cleanup reduces the adjustment field to the space needed for three or four characters, removes the active participant's redundant activation control, and uses an icon for activating other participants.

## Decision

Size every Fight HP adjustment input to four character widths plus its existing padding and borders. This controls visible width; preserve existing numeric validation and input capacity, including signs, decimals, and longer values that scroll within the field.

Render Set active only for non-active Fight participants as a play-in-circle icon button. Preserve the accessible name **Set active**, give it a tooltip identifying the participant, and retain native pointer and keyboard activation. Hide the control entirely on the active participant. Keep the existing activation operation and busy-state disabling.

## Alternatives considered

- Limit input to four characters: would change numeric entry behavior when only a smaller field was requested.
- Leave a disabled activation icon on the active participant: retains the control the user requested hiding.

## Consequences

Fight rows are more compact while keeping HP arithmetic, saved values, active selection, ordering, and counters unchanged. Current HP editors keep their existing width. Prepare and Finished presentation is unchanged.
