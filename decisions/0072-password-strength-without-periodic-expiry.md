# 0072: Password strength without periodic expiry

- Date: 2026-09-26
- Status: Accepted
- Related specs: [001: Shared identity and application access](../specs/001-shared-identity-and-access.md)

## Context

The owner requested industry-standard password strength with no scheduled password expiration. NIST SP 800-63B-4 provides the concrete password baseline for the initial single-factor login.

## Decision

- Require at least 15 characters and support passwords of at least 64 characters.
- Allow spaces and passphrases; do not require mixtures of uppercase, lowercase, digits, or symbols.
- Reject commonly used, expected, or compromised passwords using a blocklist when setting or changing a password.
- Allow password managers, autofill, and paste.
- Do not expire passwords on a schedule. Evidence of compromise can still require a password change.

These settings implement the owner's requested standard; they do not assert compliance with the entire NIST identity framework. Existing session, invitation, and reset-link expiries remain unchanged.

## Alternatives considered

- Scheduled password rotation and mandatory character mixtures: not selected because the requested baseline favors length and blocklist checks without periodic expiration.

## Consequences

Configure Identity password validation accordingly and select a blocklist mechanism during implementation planning. Remaining session defaults and abuse-control thresholds still require technical configuration.

## Reference

[NIST SP 800-63B-4, password verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#passwordver) (reviewed 2026-09-26).
