# 008: Encounter conditions and layout

- Status: Accepted for local implementation
- Date: 2026-09-28
- Source: [02 changes](../docs/02-changes.md) and follow-up answers
- Related decision: [0083](../decisions/0083-encounter-conditions-and-layout.md)

## Prepare

- The add-participant card remains open. Its fields and buttons use the same form styling as the Fight cards.
- **Add All** adds every campaign PC and NPC absent from this encounter. It does not set HP or disturb existing participants. PCs are appended first, then NPCs, each by name; repeated use adds nothing.
- Participants appear as rows with an inline Remove button. Selecting a row reveals its optional Current HP editor. Only one row is selected at a time.

## Fight

- Every Fight card has compact padding and a small gap to the next card. Its heading shows a small PC, NPC, or Mob badge to the left of the name, the muted **Turn:** count beside the name, and Set active and Hold immediately before the status button. Its HP row shows saved Current HP as a value with an edit button that reveals its input and Save button; unset HP shows the editor by default. One adjustment input has light red Damage and light green Heal buttons on the same row. There is no collapsible Actions area. Next and Skip appear only on the active card. See [decision 0086](../decisions/0086-compact-unified-fight-cards.md).
- Set active is disabled on the active participant. Initiative is hidden in Fight, though its saved value remains available for the initial order.
- The DM can apply Invisible, Grappled, and Prone to any participant in Fight via a status dialog. Multiple statuses may coexist. Each appears in a right-aligned bubble with an × removal control. Reapplying an existing status has no effect. Adding or removing a status does not change active participant, order, or counters.
- Each applied status starts at 0 turns and shows the number of that participant's **Next** actions while applied. Skip does not increase it. Status and count survive reopening; status bubbles are shown only in Fight, and finished encounters offer no editing controls. Removing and reapplying starts a new count at 0. No game-mechanical effects are automated.
- At 0 HP show Disabled with a yellow card. For negative HP above -10 show Dying with an orange card. At -10 or below retain alive adjacent. Changes to HP recalculate this derived label and color; all participants remain in turn order.

## Campaign overview

- Hide Local services on the Campaigns page. Place Encounters below Your campaigns in the left column.
- Show active Fights first, then Prepare encounters. Finished encounters start in a collapsed group and can be expanded for viewing.

These rules supersede the old Unconscious/zero-HP and collapsed Prepare-row presentation in [spec 007](007-hit-point-tracking.md), and the earlier deferral of all manual statuses.
