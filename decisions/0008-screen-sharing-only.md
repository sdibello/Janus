# 0008: Screen sharing for the initial phase

- Date: 2026-09-25
- Status: Accepted
- Related specs: [006: Player-facing encounter display](../specs/006-player-facing-display.md)
- Supersedes: None; refines [0007](0007-dm-login-and-player-display.md)
- Superseded by: None

## Context

The project owner clarified that this phase only needs screen sharing. A separate presentation experience may be desirable long term.

## Decision

Use ordinary screen sharing of the existing dungeon master UI for player viewing in this phase. No built-in broadcasting, separate presentation view, or player viewer links are required. Keep a separate presentation experience as a possible future enhancement.

## Alternatives considered

- A separate presentation view or live viewer link: deferred beyond this phase.

## Consequences

Players see what is visible in the shared dungeon master UI. Janus needs a readable encounter display but no separate player access or synchronization feature for this workflow. Future presentation requirements will be specified if that enhancement is pursued.
