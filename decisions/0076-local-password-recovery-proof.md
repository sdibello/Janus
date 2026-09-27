# 0076: Local password recovery proof and cookie revocation

- Date: 2026-09-27
- Status: Accepted for the local identity host
- Related decisions: [0054](0054-password-changes-and-session-revocation.md), [0057](0057-password-reset-links-expire-after-one-hour.md), [0074](0074-sqlite-local-test-inbox.md)

## Context

ASP.NET Core Identity supplies password reset tokens and rotates a user's security stamp on password changes, but its default token lifetime and periodic cookie validation alone do not establish Janus's one-hour, single-use reset proof or immediate revocation requirements.

## Decision

Issue an Identity password reset token only for a verified email address, store its hash with a one-hour expiry and use timestamp in the identity database, and place the link in the local test inbox. A reset requires both a valid Identity token and an unused, unexpired matching proof. Consume the proof in the same database transaction that changes the password. Respond to recovery requests identically whether or not the account exists.

Validate the Identity security stamp on each authenticated request. A password reset invalidates existing identity cookies; a signed-in password change refreshes only the current cookie after checking the current password. Apply the existing password validator to both operations.

## Consequences

The database is the authority for reset expiry and single use, including when Identity's underlying token remains valid longer. Captured reset links are sensitive local data and must not appear in ordinary API responses or logs. Current cookie revocation covers the identity host; cross-product sessions do not exist yet and must honor the same revocation when added. A real email sender and full compromised-password blocklist remain future work.
