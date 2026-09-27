# AI contributor guidance

## Context

Janus is a small project in its initial setup stage. Read README.md, relevant specs in specs/, and accepted records in decisions/ before making changes.

## Working practices

- Keep changes focused and favor simple solutions that meet the requirements.
- Follow existing conventions once established. Do not introduce a framework or dependency without a concrete need.
- Preserve unrelated work and never commit credentials, tokens, or private data.
- State assumptions and distinguish proposed choices from decisions actually made.
- Keep specs and documentation consistent with changes in behavior.
- Record durable product, design, technology, and workflow decisions in decisions/, including the reason and tradeoffs. Routine implementation details do not need separate records.

## Validation

- Run relevant checks when available; add meaningful tests for new behavior and bug fixes.
- Build and lint commands are documented in [local development](docs/LOCAL-DEVELOPMENT.md). Run the relevant checks and report only checks actually performed; executable feature tests have not been added yet.
- Summarize changes, validation performed, and remaining limitations at handoff.

## Project layout

- specs/: feature requirements, scope, acceptance criteria, and open questions.
- decisions/: numbered decision records and an index.

This file is the shared source of AI guidance. Tool-specific instruction files should point here instead of duplicating it.
