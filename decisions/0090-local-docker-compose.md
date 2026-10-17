# 0090: Local Docker Compose deployment

- Date: 2026-10-16
- Status: Accepted for local development
- Related decisions: [0073](0073-local-hosts-and-migration-ownership.md), [0074](0074-sqlite-local-test-inbox.md), [0075](0075-interactive-first-administrator-setup.md)

## Context

Janus already has separate Identity and Campaigns hosts. Running them in containers requires persistent local data and a way for Campaigns to contact Identity without changing the browser-facing OpenID Connect issuer from `localhost`. The local inbox endpoint accepts only loopback requests inside the Identity container.

## Decision

Use Docker Compose to build and run one Linux container per host for local development. Share a named volume for the existing SQLite database and local keys. Apply each host's EF Core migrations through an explicit one-off host command, Identity first, before starting the services. Keep the browser-facing issuer and redirects on `localhost`; route Campaigns' server-side Identity requests through the Compose service address. Retrieve a recipient's newest local test message through a Development-only one-off Identity command.

## Alternatives considered

- A single container for both hosts would couple their process lifecycles and make adding products harder.
- Using the Compose service name as the public issuer would require browser DNS changes and a different registered callback.
- Automatically migrating on every startup would let two hosts race on the shared SQLite file.

## Consequences

Docker Compose offers a repeatable local startup with separate host images and persistent state. The public and internal Identity addresses must be configured together. This is a Development configuration with local certificates and test messages; it does not select a cloud provider, production database, certificate source, or email service. Docker execution still needs validation on a machine with Docker installed.
