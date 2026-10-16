# 0089: Bound encounter numeric representation work

- Date: 2026-10-16
- Status: Proposed on the refactor branch
- Related specs: [004](../specs/004-initiative-and-turn-sequence.md), [007](../specs/007-hit-point-tracking.md)
- Superseded by: None

## Context

Initiative and HP use arbitrary-size integers and exact finite decimals. Their current parsers accept input up to the HTTP body limit, and decimal normalization or scale alignment can use disproportionate CPU and memory on very long input. The accepted rules deliberately avoid fixed-width arithmetic and rounding.

## Proposed decision

Allow at most 4096 characters in each supplied initiative or HP value, including a sign, decimal point, and whitespace. Reject a Damage or Heal operation if its exact canonical result exceeds 4096 characters. Keep string transport and storage and exact arithmetic within that resource budget; do not clamp or round values. The same budget applies to typed and direct API input.

This is a resource limit proposed for review on this branch. It qualifies the earlier no-application-defined-limit wording for values whose representation exceeds the budget; it does not change encounter rules or impose a fixed numeric type.

## Alternatives and tradeoffs

- Rely on the HTTP body limit: permits much more parsing and BigInteger work than an encounter needs.
- Use fixed-width numbers: would lose valid values and exact decimal behavior much earlier.
- Use a lower limit: cheaper to process, but more likely to reject an intentional game value.

The 4096-character budget is generous for ordinary play but does reject some otherwise valid extreme values. Revisit it if a real use case requires a longer representation. This branch adds focused checks for accepted and rejected boundaries.
