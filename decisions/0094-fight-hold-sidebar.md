# 0094: Put Fight Hold in a separate sidebar

- Date: 2026-10-17
- Status: Accepted for experiment on `experiment/fight-hold-sidebar`
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: Fight Hold placement and presentation in [0084](0084-encounter-hold-list.md) and [0087](0087-fight-section-headers-and-add-dialog.md)

## Context

The requested experiment keeps the participant list's width and moves Hold to a 25% column on its right. Participants should be draggable into Hold and appear there as compact name boxes that can be dragged back out.

## Decision

Expand the Fight workspace on displays at least 1600px wide. Keep the turn-order column at its existing maximum 1120px width; give Hold one quarter of the combined column widths, excluding the 24px gap. At smaller widths, stack Hold below the unchanged-width participant list rather than squeeze participant controls.

The entire Hold panel accepts active participant drops, including when empty. Use the existing saved Hold command; the Hold button remains available. Fight held tiles show only their name. Drag them to the turn-order insertion slot or into an empty order to release them using the existing command. Selecting a name by pointer or keyboard also releases it at the end of the order. Show a visible highlight when Hold accepts a drag, and clear it when the drag leaves, ends, or drops. A rejected save leaves the participant in its saved list and shows the error.

Keep HP, conditions, Round, individual Turn counts, and existing active-selection semantics. Prepare and Finished retain the detailed Hold list above participants. Save this experiment separately from the preceding layout work so the prior branch remains available.

## Alternatives considered

- Squeeze the existing list into 75% of its current container: violates the requested participant-list width.
- Keep the two columns on small displays with horizontal page scrolling: makes controls harder to reach; stacking preserves the available participant width.
- Add a separate release button to every compact tile: selecting the name gives keyboard access without adding visible controls.

## Consequences

Fight uses more horizontal space on wide displays. This is a presentation and interaction change with no database migration or new dependency. Browser tests with fixture responses verify the UI; account-backed persistence and backend Hold rules remain covered separately.

The prior layout is saved on `refactor/encounter-structure-and-numeric-limits` at `912003f`. Switch back to that branch to compare or decline the experiment.
