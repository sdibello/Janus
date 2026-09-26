# 0071: Local test inbox for email

- Date: 2026-09-26
- Status: Accepted
- Related specs: [001: Shared identity and application access](../specs/001-shared-identity-and-access.md)

## Context

Email verification and password recovery are required. Initial setup is local, so the review asked whether to send real emails or capture them in a test inbox.

## Decision

During local setup, capture verification and password-reset emails in a local test inbox instead of sending real email. Exercise the normal verification and recovery flows using the links in those captured messages.

## Alternatives considered

- Sending real email from the start through SMTP or an email service: not selected for local setup.

## Consequences

Local setup must include a test inbox and a way to inspect captured messages. This does not bypass verification, reset-link expiry, single-use requirements, or session revocation. Select the inbox tool during implementation planning and configure real delivery before cloud use. Recovery links belong in captured email, not application logs or ordinary API responses.
