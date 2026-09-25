# 0002: Reuse identity and access across applications

- Date: 2026-09-25
- Status: Accepted
- Related specs: [001: Shared user identity and application access](../specs/001-shared-identity-and-access.md)
- Supersedes: None
- Superseded by: None

## Context

The project owner requires account creation, login, password changes, and password recovery within the application flow. Future applications must be added without rebuilding user authentication and authorization. Multifactor authentication is not required at this stage.

## Decision

Provide reusable identity and access capabilities across Janus applications. Treat user context as part of application workflows and make new applications integrate with the shared capability rather than implement separate account and credential systems.

Do not require multifactor authentication in the initial scope. This decision establishes product direction only; the provider, protocol, storage design, permission model, and single sign-on behavior remain undecided. Additional details in the linked draft spec are proposals pending refinement.

## Alternatives considered

- Independent authentication and authorization implementations per application: incompatible with the requested reuse.
- Requiring multifactor authentication immediately: outside the requested initial scope.

## Consequences

New applications need an integration contract and application-specific access configuration. Shared identity and access changes can affect multiple applications, so validation must cover integration and access isolation. Applications still own their domain-specific workflows and user data.
