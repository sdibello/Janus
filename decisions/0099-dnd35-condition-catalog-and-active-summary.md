# 0099: Share the D&D 3.5 condition catalog and summarize active effects

- Date: 2026-10-17
- Status: Accepted
- Related specs: [007](../specs/007-hit-point-tracking.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Updates: [0095](0095-draggable-status-palette.md) for the available statuses and [0097](0097-top-drop-activation-and-inline-fight-controls.md)/[0098](0098-fight-name-space-and-status-alignment.md) for active turn-action placement

## Context

The DM requested a second line on the active card containing Next/Skip and status-effect summaries, plus internet research to expand the status palette. The DM explicitly selected D&D 3.5. The existing project reference already names 3.5, but includes omissions and some incorrect shorthand.

## Decision

Move Next/Skip to an active-only second row and show short, linked effect reminders beside them. Include manual conditions and HP-derived state; deduplicate identical manual/derived kinds in the summary. Show a no-status message when appropriate. Non-active cards retain only their compact heading and applied-status bubbles.

Use all 38 conditions from the [3.5 SRD Condition Summary](https://www.d20srd.org/srd/conditionSummary.htm), plus the project's four existing reference tags Dehydrated, Diseased, Poisoned, and Rebuked. Keep `Grappled` as the existing stored ID and label for SRD Grappling. Research sources, scope, and corrections are recorded in [the status reference](../docs/status.md).

Keep one catalog in `shared/conditions.json`. The frontend imports its labels/summaries/rule links; Domain embeds the same file for API validation. This avoids maintaining two independent allowlists. Include the shared data in the Docker frontend build. Add search and a bounded scrolling area to the palette so 42 statuses do not turn it into a long page.

Descriptions are informational; no automatic modifier calculation, damage, expiry, action suppression, or movement changes are introduced. Condition counts continue to measure Next actions, not magnitude or remaining duration. Existing HP-derived colors and house “alive adjacent” behavior remain unchanged, and a manual Dead status never changes saved HP. Existing text-backed condition storage needs no migration.

## Alternatives considered

- Assume a modern D&D edition: would conflict with the confirmed 3.5 ruleset and existing project reference.
- Keep separate frontend/backend lists: can let the UI offer statuses the API rejects.
- Automatically enforce summarized effects: exceeds the requested display/tracking scope and requires much more character/rules data.

## Consequences

Campaigns and the frontend must both be rebuilt to offer and accept the expanded catalog. Legacy statuses keep their IDs and counts. Reference summaries omit source-specific details and link to full rules. The active card grows vertically with its applied effects; other cards retain their compact layout.
