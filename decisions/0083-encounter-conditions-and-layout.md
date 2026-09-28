# 0083: Encounter conditions and layout

- Date: 2026-09-28
- Status: Accepted
- Related spec: [008](../specs/008-encounter-conditions-and-layout.md)

## Context

The DM needs faster encounter preparation and clearer Fight cards. HP-derived labels also need to match the new status reference, and a few manually applied statuses are now in scope.

## Decision

Use Add All for missing campaign characters and a single selected Prepare row for HP editing. Keep the add form open. In Fight, open Manage for the active participant, hide initiative, and manage Invisible, Grappled, and Prone through a dialog and removable bubbles. Count only Next actions completed while a manual status is applied; Skip leaves its count unchanged. Derive Disabled at 0 HP and Dying between -10 and 0, preserving alive adjacent at -10 or below. Put encounters below campaigns, sorted by phase with Finished collapsed, and hide Local services from the Campaigns page.

## Consequences

Manual statuses persist on encounter participants and require a campaign database migration. They have no automated game effects. Prior Unconscious and zero-HP presentation rules are superseded; saved HP values and encounter progress do not change.
