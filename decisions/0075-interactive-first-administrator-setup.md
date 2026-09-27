# 0075: Interactive first-administrator setup

- Date: 2026-09-27
- Status: Accepted for local setup
- Related decisions: [0050](0050-first-shared-administrator-during-setup.md), [0074](0074-sqlite-local-test-inbox.md)

## Context

Invitation-only registration needs an initial shared administrator, but a public bootstrap page would create an unauthenticated administrator path.

## Decision

After identity migrations, run the identity host once with `--setup-admin` from an interactive terminal. The command asks for username, email, and a password without echo; it refuses to run if a shared administrator already exists. It creates an unverified account, assigns the shared administrator role, and places a verification message in the local test inbox. The administrator verifies email before signing in or issuing invitations.

## Consequences

There is no public setup endpoint or initial password in configuration or source control. An operator needs terminal access during first setup. Recovery for a lost sole administrator is not provided by this command and needs a separate, controlled procedure before production use.
