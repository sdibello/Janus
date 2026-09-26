# 0024: Use unrestricted whole-number initiative

- Date: 2026-09-25
- Status: Accepted
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md)
- Supersedes: None; resolves Q06 in [the requirements review](../specs/OPEN-QUESTIONS.md)
- Superseded by: None

## Context

The project owner specified that initiative is a whole number, may be positive or negative, and does not need an application-defined limit.

## Decision

Accept whole-number initiative values, including positive values, negative values, and zero. Do not define an application-level minimum or maximum.

## Alternatives considered

- Limiting initiative to a fixed range: unnecessary for the stated requirement.
- Allowing fractional values: inconsistent with the requested whole-number format.

## Consequences

The Prepare flow validates whole numbers without imposing a game-specific range. Technical storage limits may still exist in the chosen implementation; do not present them as a product-level initiative range.
