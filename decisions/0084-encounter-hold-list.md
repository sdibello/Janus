# 0084: Hold encounter participants outside the turn order

- Date: 2026-09-28
- Status: Accepted
- Related specs: [003](../specs/003-encounters-and-participants.md), [004](../specs/004-initiative-and-turn-sequence.md), [005](../specs/005-manual-encounter-order.md)
- Supersedes: The all-participants initiative and Round rules in those specs for held participants
- Superseded by: None

## Context

The dungeon master needs to prepare participants who may join a Fight later and temporarily remove participants from its turn sequence without deleting them.

## Decision

Show a saved Hold list above the active list in Prepare, Fight, and Finished. A participant can be added directly to Hold during Prepare or Fight. During Prepare, a button moves a participant into or out of Hold. During Fight, a button moves an active participant to Hold, and dragging a held participant into the active list releases it at the indicated slot. Held participants require no initiative to begin Fight, receive no Next or Skip action, and do not count toward Round completion. Moving between lists does not itself change Round or individual Turn counts. A newly added participant starts at zero turns; a participant returning from Hold retains previous turns and rejoins the current Round as incomplete.

The final active participant may be held. This leaves Fight paused with no active turn until a participant is released or added to the active list. Releasing into an empty active list makes that participant active. Releasing into a nonempty list keeps the current active participant. Active-first display means release slots in a nonempty Fight begin after the active tile.

## Alternatives considered

- Require every held participant's initiative before Fight: unnecessary because held participants are outside the initial order.
- Reset a returning participant's Turn count: would erase turns already taken in the encounter.
- Require at least one active participant throughout Fight: would prevent holding the final participant for as long as needed.

## Consequences

The participant's Hold state must persist. Turn advancement, Round completion, Set active, and manual reordering operate only on active participants. Finished encounters display both saved lists without modification controls.
