# 0018: Keep HP within each encounter

- Date: 2026-09-25
- Status: Accepted
- Related specs: [002](../specs/002-campaigns-and-characters.md), [007](../specs/007-hit-point-tracking.md)
- Supersedes: None; resolves HP ownership left open in [0014](0014-hit-point-scope.md)
- Superseded by: None

## Context

The project owner specified that HP is entered at the start of each encounter, is not carried between encounters, and must be stored when leaving and returning to the same encounter.

## Decision

Store current HP on each encounter participant. New encounters begin with unspecified HP for their participants; the dungeon master may enter starting HP during Prepare. Keep HP optional as established in decision 0015. Do not supply HP from campaign characters or other encounters, and do not inherit another encounter's HP-derived status.

Reopening the same encounter restores its saved current HP and corresponding status rather than resetting HP or requesting starting values again. Mobs added during Fight can have optional HP entered when added.

## Alternatives considered

- Carrying remaining HP between encounters: explicitly excluded.
- Resetting HP on every encounter visit: would lose the required saved progress.

## Consequences

The same PC or NPC can have different HP in separate encounters. Updates and historical viewing must remain isolated by encounter, including negative values and their statuses.
