# 0079: Alpha encounter preparation and rotating Fight order

- Date: 2026-09-28
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md), [007](../specs/007-hit-point-tracking.md)
- Supersedes: [0011](0011-prepare-and-fight.md), [0020](0020-turn-counter-wrap-only.md), [0023](0023-manual-initiative-ties.md), [0025](0025-round-and-individual-turn-counters.md), [0027](0027-skip-and-no-removal-during-fight.md), [0029](0029-display-initiative-values.md)
- Superseded by: [0080](0080-keep-active-on-reorder-and-show-drop-slot.md) for the reorder-active rule and [0083](0083-encounter-conditions-and-layout.md) for collapsed Prepare rows and Fight initiative display

## Context

The owner reviewed the alpha encounter UI in [Alpha changes](../docs/Alpha-changes.md). Initiative controls, HP actions, and campaign editing currently crowd Prepare. The fixed Fight list also does not match the requested active-first tile presentation. Follow-up answers established how initiative prompts, ties, saved ordering, Skip, and Round should work.

## Decision

Prepare remains an editable encounter phase with optional starting HP, but Damage and Heal are shown only during Fight. Participant rows start collapsed. Begin Fight sits beside the encounter name and opens a lightbox that prompts for initiative one participant at a time. Previously saved values prefill the prompts; each answer is saved with Prepare so canceling or reopening retains partial progress. Closing the lightbox returns to Prepare. After all participants have a valid whole-number initiative, the DM reviews the highest-first initial order and explicitly confirms Fight. Ties keep the order participants entered the encounter; no Prepare tie Move Up/Down controls are needed.

Fight uses a single column of participant tiles. The active participant appears first in the displayed cyclic sequence. Next and Skip move that active tile to the bottom of the displayed sequence and save the resulting order. Next increments that participant's individual Turn count; Skip does not. A participant counts as completed for the current Round after either action. Round starts at 1 and increments once after every participant in that Round has completed an action; a participant added during Fight joins the current Round. Repeat actions for one participant do not substitute for another's action. Save Round progress across reopen. Set active leaves the saved order unchanged. Dragging saves the chosen order without an extra rotation; the existing pre-reorder successor rule chooses the new active participant. No participant can be removed during Fight. Finished encounters retain final state for viewing.

The campaign app uses a focused encounter screen for Prepare, Fight, and Finished, with a Back to campaign control. Campaign editing and Local services are hidden there, while a compact session box remains in the upper-right header.

## Alternatives considered

- Entering initiative throughout Prepare and manually arranging ties: replaced by the one-at-a-time Fight-start prompt and entry-order ties.
- Rotating only the display: rejected; Next and Skip save the rotated order.
- Incrementing Round only on a Next wrap: replaced by per-participant Round completion, including Skip and Fight additions.
- Starting Fight immediately after the last initiative entry: rejected in favor of reviewing and confirming the order.

## Consequences

The encounter engine must persist per-Round completion and save order, active participant, and counters atomically. Existing Prepare initiative values remain usable. The old specs and tests need updating before this alpha workflow is considered implemented; the ordered work is in [the task list](../docs/ALPHA-IMPLEMENTATION-TASKS.md).
