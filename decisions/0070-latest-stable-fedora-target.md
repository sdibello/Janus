# 0070: Latest stable Fedora test target

- Date: 2026-09-26
- Status: Accepted
- Related specs: [Release requirements](../specs/README.md)

## Context

Fedora is the primary test platform. The owner instructed the project to assume the latest release instead of asking for the laptop's installed release number.

## Decision

Use the latest stable Fedora release as the local setup and primary test target. Windows 11 remains supported. Verify and record the concrete Fedora release when setting up and running validation.

## Alternatives considered

- Waiting for the owner to report an installed release number: not needed.
- Pinning the earlier example release number without verification: not chosen.

## Consequences

Select compatible runtime and dependency versions during implementation planning against the then-current stable Fedora release. Record actual tested versions so validation results remain reproducible. This decision does not claim that any Fedora testing has occurred.
