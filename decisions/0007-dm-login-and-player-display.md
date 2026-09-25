# 0007: Dungeon master login and player-facing display

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001](../specs/001-shared-identity-and-access.md), [002](../specs/002-campaigns-and-characters.md), [003](../specs/003-encounters-and-participants.md), [006](../specs/006-player-facing-display.md)
- Supersedes: None
- Superseded by: None

## Context

During requirements review, the project owner confirmed that only a dungeon master logs in initially, but wants to share the UI with players during play to make the flow easier.

## Decision

The initial authenticated user is the dungeon master. Players do not need accounts or logins for the initial scope. Support showing the UI to players during play. [Decision 0008](0008-screen-sharing-only.md) subsequently resolves the initial sharing method as ordinary screen sharing of the existing UI.

This does not authorize public encounter access or establish a player editing role. Existing ownership restrictions on management actions remain in place.

## Alternatives considered

- Requiring all players to create accounts: not needed for the stated initial workflow.

## Consequences

The dungeon master operates Janus while players watch. Decision 0008 limits the current phase to screen sharing; a separate presentation experience remains a possible future enhancement.
