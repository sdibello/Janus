# 001: Shared user identity and application access

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0002: Reuse identity and access across applications](../decisions/0002-shared-identity-and-access.md)

## Problem and intended outcome

Users need to create an account, log in, and manage their passwords as part of the normal application experience. Janus must support additional applications without rebuilding authentication (identifying a user) or authorization (determining what the user may access).

A user has a shared Janus identity. Each application can use that identity and apply its own access permissions and application-specific user information.

For Janus's initial campaign and encounter workflow, the authenticated user is the dungeon master. Players do not need accounts or logins; the player viewing experience is covered in [spec 006](006-player-facing-display.md).

## Scope

Included: account creation, login, logout, password changes, forgotten-password recovery, shared user identity, and reusable application access checks.

Multifactor authentication is not required for the initial release. Social login, enterprise federation, organization management, and a full administration interface are outside this initial requirement. Future authentication improvements should be possible through the shared identity capability.

## Requirements

### Account creation and login

- R1: A new user can create an account from the application flow with a login identifier and password. Required profile fields and identifier type remain to be decided.
- R2: Each account has a stable internal user identifier that applications can reference independently of changeable profile or login information.
- R3: Duplicate accounts for the same normalized login identifier are prevented. Account creation and login failures provide useful guidance without exposing sensitive account information.
- R4: A registered user can log in with valid credentials and continue to an authorized application destination. Invalid credentials do not establish a session or grant access.
- R5: A user can log out. The session used for logout can no longer access protected functionality. Session expiration and the scope of logout across applications must be defined before implementation.

### Password management

- R6: A logged-in user can change their password after proving knowledge of the current password. A failed proof leaves the password unchanged.
- R7: A user who has forgotten their password can request recovery from the login flow using a verified recovery channel. The initial proposed channel is email; this is an assumption pending confirmation.
- R8: Recovery requests give a neutral response regardless of whether an account exists. A reset requires valid recovery proof that expires and can be used only once. Invalid, expired, or previously used proof cannot change a password.
- R9: After a successful change or reset, the old password no longer works and the new one does. Proposed session behavior: reset revokes all existing sessions; authenticated change revokes other sessions and renews the current session. Confirm this policy before implementation.
- R10: Passwords and recovery secrets must not appear in application responses, logs, or decision/spec documents. Passwords must not be stored as plaintext or in a recoverable form. Define password policy, recovery expiry, and abuse controls before implementation, using the selected identity implementation's supported security controls.

### User information in the application flow

- R11: Applications can obtain the current user's stable identity and the profile information needed for their own workflow after authentication.
- R12: Shared account information is maintained by the shared identity capability. Application-specific profile and onboarding data remain owned by the relevant application and are linked by stable user identifier.
- R13: An application can require its own onboarding after login without creating a second identity or requiring the user to register again. The exact shared profile fields and onboarding requirements remain open.
- R14: A user cannot obtain another user's private profile information simply by changing a supplied identifier. Applications receive only the user information they are authorized to access.

### Reuse across applications

- R15: Authentication, credential handling, recovery, and common authorization enforcement are provided through a shared capability with a documented integration contract.
- R16: Adding an application requires registering/configuring that application and integrating with the shared contract, without duplicating or rewriting account creation, credential storage, login, password recovery, or common access-check logic.
- R17: Applications may define their own permissions and map their protected operations to them. Access is scoped to the application; access to one application does not automatically grant access to another.
- R18: Authentication alone does not grant every application permission. Missing or insufficient permissions deny protected operations, with enforcement at the trusted server/API boundary as well as appropriate UI behavior.
- R19: The same user identity can be recognized by multiple authorized applications. Whether a login session is shared seamlessly between applications (single sign-on) is a separate open decision.
- R20: The integration contract documents how an application identifies itself, obtains authenticated user context, checks access, handles expired sessions and denied access, and separates shared user data from its own data.

## Acceptance criteria

- [ ] A new user completes registration through an application and can subsequently log in.
- [ ] A repeated registration for the same normalized identifier does not create a duplicate identity.
- [ ] Invalid credentials fail, and an unauthenticated request cannot access a protected operation.
- [ ] Login returns the user to an authorized application destination; logout prevents reuse of the logged-out session.
- [ ] A password change with incorrect current credentials fails without changing the password.
- [ ] A successful password change makes the old password fail and the new password succeed, with session handling matching the agreed policy.
- [ ] Recovery requests for existing and nonexistent accounts return a neutral user-facing response.
- [ ] Valid recovery proof allows a password reset; expired, invalid, and reused proof do not.
- [ ] A successful reset makes the old password fail and handles existing sessions according to the agreed policy.
- [ ] An application obtains the current user's permitted shared information and can attach its own onboarding data without creating another account.
- [ ] Attempts to read another user's private profile information are denied.
- [ ] Two minimal example applications use the same identity capability and recognize the same stable user identifier without duplicating credential or recovery implementations.
- [ ] A user authorized for an operation in application A but not application B is denied that operation in B, including direct API requests.
- [ ] A new application can be integrated using the documented contract and application configuration without rewriting the shared identity and access implementation.
- [ ] Initial registration, login, password change, and recovery flows do not require a second authentication factor.

## Validation

When implementation exists, exercise the account and password lifecycle through integration tests and a manual walkthrough. Include negative cases for credential failures, expired/reused recovery proof, session invalidation, unauthorized profile access, and direct calls to protected operations.

Use two minimal application integrations to validate identity reuse and permission isolation. Review credential handling and verify that logs and responses do not disclose secrets. No application code or executable tests exist yet.

## Open questions

- Should users sign in with email, username, or either? Is email verification required before first access?
- Is email the recovery channel, and what shared profile fields are required?
- Are new accounts allowed to join freely, or should registration require an invitation or approval?
- Should applications share a single sign-on session? What should logout do across applications?
- How is application access granted initially, and are simple roles sufficient or are individual permissions needed?
- What are the password, session expiry, reset expiry, and abuse-control policies? Confirm the proposed session revocation behavior in R9.
- Which identity provider/library, integration protocol, and deployment model will implement the shared capability? These remain unselected.
