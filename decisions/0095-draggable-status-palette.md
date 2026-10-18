# 0095: Apply Fight statuses from a shared draggable palette

- Date: 2026-10-17
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: Status dialog in [0083](0083-encounter-conditions-and-layout.md), per-row Hold/status-picker controls in [0086](0086-compact-unified-fight-cards.md), [0093](0093-inactive-fight-hp-placement.md), and [0094](0094-fight-hold-sidebar.md)
- Updated by: [0097](0097-top-drop-activation-and-inline-fight-controls.md) for activation and the shared active/non-active row layout
- Updated by: [0099](0099-dnd35-condition-catalog-and-active-summary.md) for the expanded D&D 3.5 catalog

## Context

The DM wants to apply statuses by dragging them from a shared list below Hold, and to remove redundant Hold buttons now that participants can be dropped into Hold.

## Decision

Place a Statuses box beneath Hold in the same sidebar. Offer draggable Invisible, Grappled, and Prone items. Dropping one onto an active or non-active turn-order participant applies it using the existing saved condition operation. Highlight a valid target while dragging. Distinguish status payloads from participant drags so applying a status cannot reorder, hold, or release anyone. Reapplying an existing status does not duplicate it or reset its count.

Remove the Hold and status-picker buttons from all Fight rows and retire the status dialog. Keep Set active and applied-status bubbles with their × removal controls. Preserve the aligned name/Turn, HP, and action columns and the active participant's separate HP row.

For keyboard access, selecting a palette status and pressing Enter or Space on a focused participant applies it; Escape clears the selection. Alt+H on a focused Fight participant moves it to Hold. Selecting a held name still releases it. Prepare keeps its Hold buttons; Finished stays read-only, without the status palette.

## Alternatives considered

- Keep per-row status pickers alongside the palette: duplicates the requested shared workflow.
- Remove status bubbles as well: would hide saved status counts and remove the existing direct removal action.

## Consequences

The sidebar contains both Hold and Statuses, stacking below the unchanged-width turn order on smaller displays. HP, order, active selection, Round, individual Turn counts, condition duration rules, authorization, and persistence semantics remain unchanged. No database migration or new dependency is required. Rejected saves show the existing error and retain saved conditions.
