# 006: Player-facing encounter display

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0007: Dungeon master login and player-facing display](../decisions/0007-dm-login-and-player-display.md), [0008: Screen sharing for the initial phase](../decisions/0008-screen-sharing-only.md)
- Related specs: [004: Turn sequence](004-initiative-and-turn-sequence.md), [005: Manual ordering](005-manual-encounter-order.md)

## Problem and intended outcome

Only the dungeon master logs in initially. The dungeon master wants to share the UI with players during play so they can follow the encounter more easily without needing their own accounts.

## Scope

Included: showing the existing dungeon master encounter UI through ordinary screen sharing during play. Screen sharing is provided by the dungeon master's chosen external tool; Janus does not need to implement broadcasting.

A separate presentation view is a possible future enhancement, not a commitment for this phase. Player accounts, viewer links, separate player screens, and viewer synchronization are outside the current scope.

## Requirements

- R1: The dungeon master remains the authenticated operator of the encounter.
- R2: The dungeon master shows the existing encounter UI using an external screen-sharing tool. Players do not access Janus directly or require accounts or logins.
- R3: The shared image shows the same visible encounter UI that the dungeon master sees, including participant order, active highlighting, and the Round and individual Turn counters from specs 004 and 005. No separate player content filter is required in this phase.
- R4: Screen sharing does not introduce a Janus player role, editing permission, anonymous endpoint, or viewer-link access model.

## Acceptance criteria

- [ ] The dungeon master can show the existing encounter UI through an external screen-sharing tool without player login to Janus.
- [ ] Participant order, active highlighting, and the Round and individual Turn counters remain readable in the shared encounter view as the dungeon master advances and reorders participants.
- [ ] Ending an encounter is reflected in that same shared UI.
- [ ] The workflow requires no separate presentation page or direct player access to Janus.

## Validation

When implemented, manually share the encounter window using an external screen-sharing tool and check readability during turn advancement, reordering, and ending. No application code or executable tests exist yet.

## Open questions

None about the sharing method for this phase. If a separate presentation experience is requested later, specify its content visibility, delivery method, and any access or synchronization requirements then.
