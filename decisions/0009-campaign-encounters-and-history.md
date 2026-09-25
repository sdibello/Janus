# 0009: Campaign encounters and retained history

- Date: 2026-09-25
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: None; refines [0004](0004-encounter-local-mobs.md)
- Superseded by: None

## Context

The project owner confirmed that every encounter belongs to a campaign, PCs and NPCs are selected from that campaign, mobs can be added at any time and need no storage outside the encounter, and finished encounters must remain viewable.

## Decision

Require a campaign for every encounter and restrict PC/NPC selection to that campaign. Allow encounter-local mob creation during preparation and active play. Retain finished encounters and their saved participants for later viewing from the campaign.

[Decision 0011](0011-prepare-and-fight.md) establishes initiative ordering in Prepare and user-chosen mob placement in Fight, and retains the finished UI without modification controls. First-turn timing and exact historical display remain open. Viewing finished encounters does not by itself require replaying every turn.

## Alternatives considered

- Standalone encounters or cross-campaign character selection: inconsistent with the confirmed campaign scope.
- Restricting mob additions to encounter preparation: would prevent additions during play.
- Discarding encounters or their mobs when ended: would prevent later viewing.

## Consequences

Character selection must enforce campaign membership, including for campaigns owned by the same user. Ending an encounter preserves it. Later changes to campaign character records must not break finished encounter viewing. Any future campaign deletion or cleanup policy must address preservation of finished encounters explicitly.
