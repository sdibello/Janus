# 0074: SQLite-backed local test inbox

- Date: 2026-09-27
- Status: Accepted for local development
- Related decisions: [0071](0071-local-test-inbox-for-email.md), [0073](0073-local-hosts-and-migration-ownership.md)

## Context

Email verification needs a visible local message without sending mail externally. The initial plan proposed Mailpit, which would add another process and dependency to the small local setup.

## Decision

Capture outgoing verification messages in the identity SQLite database. The Development identity host exposes the latest messages through a loopback-only endpoint used by the access portal. Registration and administrator setup still create normal Identity verification tokens, and the user must follow the captured link to verify. Invitations and verification secrets are never returned by ordinary registration or login responses.

## Consequences

Local setup needs no mail service. The inbox and its live verification links are sensitive local data, so they remain outside source control with the database. A production email sender must replace this capture before deployment; the development inbox endpoint must stay unavailable outside Development. Password recovery will use this capture when implemented. Local database transfer and cleanup guidance must account for captured messages.
