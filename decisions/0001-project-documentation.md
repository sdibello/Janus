# 0001: Keep project guidance and planning in the repository

- Date: 2026-09-25
- Status: Accepted
- Related specs: None
- Supersedes: None
- Superseded by: None

## Context

The project needs a lightweight starting structure with AI instructions, specifications, and a lasting record of decisions, as requested by the project owner.

## Decision

Use AGENTS.md for shared AI contributor guidance, with pointers for Claude and GitHub Copilot. Keep Markdown specifications in specs/ and numbered decision records in decisions/. Use a root .gitignore for common local secrets and generated artifacts.

Leave application technology and tooling undecided until project requirements are available.

## Alternatives considered

- A full project framework: deferred until the project has concrete requirements.
- Conversation-only decisions: insufficient as a durable, versioned project record.

## Consequences

The structure is lightweight and reviewable in Git. Contributors must keep specs and the decision index current, and refine ignore rules when the stack is chosen.
