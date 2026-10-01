# 0087: Compact Fight section headers and add dialog

- Date: 2026-09-30
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [008](../specs/008-encounter-conditions-and-layout.md)
- Supersedes: The always-visible Fight add form in [0083](0083-encounter-conditions-and-layout.md)
- Superseded by: None

## Context

The Fight screen spends vertical space on explanatory paragraphs and the add-participant form above the turn order.

## Decision

Keep the Hold heading and its participant count on one row, with its explanatory text in a help icon's hover title. Place the turn-order instructions in a similar help icon beside Turn order. Put **Add Participant** and **End encounter** in the Turn order heading. During Fight, Add Participant opens the existing PC, NPC, and mob forms in a modal dialog; a successful add closes it. Keep the forms visible in Prepare.

## Consequences

The Fight screen leaves more room for participants. Adding a participant remains available during Fight, including adding directly to Hold. The same forms and save behavior serve both phases.
