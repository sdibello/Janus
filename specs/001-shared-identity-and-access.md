# 001: Shared user identity and application access

- Status: Draft
- Date: 2026-09-25
- Related decisions: [0002: Reuse identity and access across applications](../decisions/0002-shared-identity-and-access.md)

## Problem and intended outcome

Users need to create an account, log in, and manage their passwords as part of the normal application experience. Janus must support additional applications without rebuilding authentication (identifying a user) or authorization (determining what the user may access).

A user has a shared Janus identity. Each application can use that identity and apply its own access permissions and application-specific user information.

Future applications are separate products with their own purposes, sharing accounts through the same identity system. See decision [0039](../decisions/0039-separate-products-sharing-accounts.md).

For Janus's initial campaign and encounter workflow, the authenticated user is the dungeon master. Players do not need accounts or logins; the player viewing experience is covered in [spec 006](006-player-facing-display.md).

## Scope

Included: account creation, login, logout, password changes, forgotten-password recovery, shared user identity, and reusable application access checks.

Application access includes a user request and administrator approval workflow in one shared portal across products. Separate per-product request and approval pages are not required. A broader administration suite remains outside the initial scope.

Multifactor authentication is not required for the initial release. Social login, enterprise federation, organization management, and a full administration interface are outside this initial requirement. Future authentication improvements should be possible through the shared identity capability.

## Requirements

The shared identity capability uses ASP.NET Core Identity for accounts and passwords and OpenIddict for OpenID Connect sign-in across products. It runs locally initially and moves to the cloud later. Application-specific invitation, access approval, and session rules below remain required implementation work. See decision [0067](../decisions/0067-self-hosted-identity-and-openiddict.md).

### Account creation and login

- R1: A new user can create an account with a valid invitation, username, email address, and password. Both username and email address must be nonblank. Email verification is required before the account can access Janus. Open self-registration is not supported.
- R1a: A registration invitation identifies the product it grants access to. Accepting a valid invitation, completing registration, and verifying email grants access to that product without a separate access request or approval. It does not grant access to other products. See decision [0047](../decisions/0047-registration-invitation-grants-product-access.md).
- R1b: Shared administrators can issue registration invitations for any product. Product administrators can issue invitations only for their own product. Invitation issuance does not grant authority to appoint administrators. See decision [0051](../decisions/0051-shared-and-product-administrators-issue-invitations.md).
- R1c: Registration invitation links are reusable by multiple people and are not tied to a specific recipient email address. A successful registration does not consume the link; each registrant must still complete registration and email verification. Links expire 24 hours after issuance; reuse does not restart or extend their validity. Expired links cannot authorize new registrations, and expiry does not revoke access already granted. See decisions [0052](../decisions/0052-reusable-registration-invitations.md) and [0053](../decisions/0053-invitations-expire-after-24-hours.md).
- R2: Each account has a stable internal user identifier that applications can reference independently of changeable profile or login information.
- R3: Duplicate accounts for the same normalized username or email address are prevented. Account creation and login failures provide useful guidance without exposing sensitive account information.
- R4: A user can log in with a username or email address and valid password, and continue to an authorized application destination. An unverified email address, invalid credentials, or an unauthorized destination does not establish access.
- R5: A user can log out of the current application. The session used for logout can no longer access its protected functionality; other applications remain signed in. Returning to the application automatically establishes a new application session if the shared login remains active and the user remains authorized, without requiring an explicit Sign in action. See decisions [0040](../decisions/0040-single-sign-on-and-local-logout.md) and [0041](../decisions/0041-automatic-sign-in-after-local-logout.md). Session expiration remains to be defined.

- R5a: Login persists after closing and reopening the browser only when the user selects Remember me. Otherwise, reopening the browser requires login again. Shared identity and product sessions must honor this choice together. Remembered login expires after 30 days without user activity; activity while the login is valid renews the period to another 30 days. After expiry, login is required again. Password-driven revocation still applies. See decisions [0055](../decisions/0055-remember-me-for-persistent-login.md) and [0056](../decisions/0056-remember-me-30-days-since-activity.md).

### Password management

- R6: A logged-in user can change their password after proving knowledge of the current password. A failed proof leaves the password unchanged.
- R7: A user who has forgotten their password can request recovery from the login flow using their email address. Password reset requires a verified email address.
- R8: Recovery requests give a neutral response regardless of whether an account exists. A reset requires valid recovery proof that expires one hour after issuance and can be used only once. Invalid, expired, or previously used proof cannot change a password. See decision [0057](../decisions/0057-password-reset-links-expire-after-one-hour.md).
- R9: After a successful change or reset, the old password no longer works and the new one does. A forgotten-password reset revokes all existing sessions across products and devices. An authenticated password change revokes all other sessions across products and devices and renews the current session, keeping the user signed in there. Revocation covers shared identity and product sessions; a revoked shared login cannot automatically restore access. See decision [0054](../decisions/0054-password-changes-and-session-revocation.md).
- R10: Passwords and recovery secrets must not appear in application responses, logs, or decision/spec documents. Passwords must not be stored as plaintext or in a recoverable form. Apply R10a and define abuse controls before implementation, using the selected identity implementation's supported security controls, and configure the one-hour recovery expiry required by R8.

- R10a: Require passwords of at least 15 characters and support at least 64 characters. Allow spaces and passphrases without mandatory character-type mixtures. Reject commonly used, expected, or compromised passwords through a blocklist during registration, password change, and reset. Allow password managers, autofill, and paste. Do not require scheduled password changes; evidence of compromise can still require a change. Existing session and link expiries remain unchanged. See decision [0072](../decisions/0072-password-strength-without-periodic-expiry.md).

### User information in the application flow

- R11: Applications can obtain the current user's stable identity and the profile information needed for their own workflow after authentication.
- R12: Shared account information is maintained by the shared identity capability. Application-specific profile and onboarding data remain owned by the relevant application and are linked by stable user identifier.
- R13: An application can require its own onboarding after login without creating a second identity or requiring the user to register again. Username and email address are the only shared account profile fields in the initial scope; no additional profile fields are needed for now. Application-specific onboarding requirements remain open. See decision [0038](../decisions/0038-minimal-account-profile.md).
- R14: A user cannot obtain another user's private profile information simply by changing a supplied identifier. Applications receive only the user information they are authorized to access.

### Reuse across applications

- R15: Authentication, credential handling, recovery, and common authorization enforcement are provided through a shared capability with a documented integration contract that supports separate products sharing accounts.
- R16: Adding an application requires registering/configuring that application and integrating with the shared contract, without duplicating or rewriting account creation, credential storage, login, password recovery, or common access-check logic.
- R17: Applications may define their own permissions and map their protected operations to them. Access is scoped to the application; access to one application does not automatically grant access to another.
- R17a: Users request access to additional products, and an administrator approves it. Existing accounts do not automatically receive access to new products, and pending requests do not grant access. Registration invitations grant access to the invited product as specified in R1a. See decisions [0042](../decisions/0042-request-and-approve-application-access.md) and [0047](../decisions/0047-registration-invitation-grants-product-access.md).
- R17b: Shared administrators can manage access approvals across all products. Product administrators can manage access approvals for their own product; that role alone does not authorize approvals for other products. These roles do not override campaign ownership rules. See decision [0043](../decisions/0043-shared-and-product-administrators.md).
- R17c: The initial campaign product requires no additional roles or custom permissions beyond approved DMs and the agreed shared and product administrators. Approved users manage their own campaigns under the established ownership rules; players require no accounts for screen sharing. See decision [0044](../decisions/0044-no-additional-initial-product-roles.md).
- R17d: An administrator authorized to review a product's access requests can reject a request. The user can then submit another request for that product without administrator permission to request again. Rejected requests do not grant access, and a new request still requires approval. See decision [0045](../decisions/0045-repeat-access-requests-after-rejection.md).
- R17e: Shared administrators can revoke approved access to any product; product administrators can revoke approved access to their own product. Revoked access no longer authorizes protected product operations, including through an existing login, and does not affect access to other products. The affected user can request access again without permission to submit a new request; restoration requires approval. See decision [0046](../decisions/0046-revoke-access-and-allow-new-requests.md).
- R17f: One shared portal provides access requests and administrator review across products. Users can reach the request workflow without already having access to the requested product. Administrators see only requests and management controls within their authorized scope, with the same scope enforced at the server/API boundary. See decision [0048](../decisions/0048-shared-access-request-portal.md).
- R17g: Only shared administrators can appoint shared or product administrators. Product administrators cannot appoint administrators, even for their own product. Designate the first shared administrator account during deployment or setup, without a public setup page; the specific mechanism will be selected with the technology stack. See decisions [0049](../decisions/0049-shared-administrators-appoint-administrators.md) and [0050](../decisions/0050-first-shared-administrator-during-setup.md).
- R18: Authentication alone does not grant every application permission. Missing or insufficient permissions deny protected operations, with enforcement at the trusted server/API boundary as well as appropriate UI behavior.
- R19: The same user identity is recognized by multiple authorized applications. Opening another authorized application uses the existing login to sign the user in automatically without requiring credentials again (single sign-on). This does not itself grant application access. See decision [0040](../decisions/0040-single-sign-on-and-local-logout.md).
- R20: The integration contract documents how an application identifies itself, obtains authenticated user context, checks access, handles expired sessions and denied access, and separates shared user data from its own data.

## Acceptance criteria

- [ ] A new user completes registration through an application and can subsequently log in.
- [ ] Registration without a valid invitation is rejected.
- [ ] Multiple distinct users can register through the same valid invitation link; an earlier registration does not invalidate it, and each user must verify their own email before product access.
- [ ] An invitation can authorize registration before its 24-hour expiry, but cannot do so at or after expiry. Reusing the link does not extend its validity, and expiry does not remove previously granted product access.
- [ ] Shared administrators can issue invitations for any product, while product administrators can issue invitations only for their own product. Attempts to issue invitations without the required authority are denied, including through direct API requests.
- [ ] An unverified account cannot access Janus; accepting a valid registration invitation, completing registration, and verifying email enables access to the invited product without a separate access request or approval, but does not grant access to other products.
- [ ] A user can log in with either their username or email address and password.
- [ ] Selecting Remember me allows login to persist after closing and reopening the browser within the agreed validity period. Without that selection, reopening requires login again, including across products using shared sign-in.
- [ ] A remembered login expires after 30 days without user activity. Activity before expiry renews validity to 30 days from that activity; returning at or after expiry requires login again.
- [ ] A repeated registration for the same normalized username or email address does not create a duplicate identity.
- [ ] Invalid credentials fail, and an unauthenticated request cannot access a protected operation.
- [ ] Login returns the user to an authorized application destination; logout prevents reuse of the logged-out session.
- [ ] After signing into one application, opening another authorized application signs the user in without requesting credentials again.
- [ ] Logging out of one application invalidates its session while leaving other applications signed in.
- [ ] Returning to that application after logout automatically establishes a new session without a Sign in action when the shared login is still active and application access remains authorized; the invalidated session cannot be reused.
- [ ] A password change with incorrect current credentials fails without changing the password.
- [ ] Registration, password changes, and resets enforce R10a: reject passwords below 15 characters or on the blocklist, accept permitted long passphrases without character-mixture rules, and do not expire passwords solely because of age.
- [ ] A successful password change makes the old password fail and the new password succeed, renews the current session without signing the user out there, and revokes all other sessions across products and devices.
- [ ] Recovery requests for existing and nonexistent accounts return a neutral user-facing response.
- [ ] Password reset instructions are sent to the account's verified email address.
- [ ] Valid, unused recovery proof allows a password reset before one hour from issuance; at or after that expiry, or if invalid or already used, it cannot reset a password.
- [ ] A successful reset makes the old password fail and revokes all existing sessions across products and devices, including shared identity sessions that could otherwise automatically sign the user in again.
- [ ] An application obtains the current user's permitted shared information and can attach its own onboarding data without creating another account.
- [ ] The initial account profile contains only username and email address as profile fields.
- [ ] Attempts to read another user's private profile information are denied.
- [ ] Two minimal example applications use the same identity capability and recognize the same stable user identifier without duplicating credential or recovery implementations.
- [ ] A user authorized for an operation in application A but not application B is denied that operation in B, including direct API requests.
- [ ] An existing user can request access to a new product; access remains denied while the request is pending and is granted when an authorized administrator approves it.
- [ ] After an authorized administrator rejects a product access request, the user can submit another request for that product without permission to request again; access remains denied until approval.
- [ ] An authorized administrator can revoke approved product access; subsequent protected operations are denied even with an existing login, while access to other products is unaffected. An administrator without authority for that product cannot revoke its access.
- [ ] A user whose product access was revoked can submit a new request without permission to request again; access is restored only after approval.
- [ ] Users submit product access requests through one shared portal. Shared administrators can review requests across products, while product administrators see only the requests and controls they are authorized to manage; direct requests outside that authority are denied.
- [ ] A shared administrator can appoint shared or product administrators. Users without shared administrator authority, including product administrators, cannot assign either administrator role through the UI or direct API requests.
- [ ] Documented deployment/setup steps establish the first shared administrator account without a public setup page; subsequent administrator appointments require shared administrator authority.
- [ ] A shared administrator can approve access requests for any product; a product administrator can approve requests for their own product but cannot approve requests for another product without separate authority, including through direct API requests.
- [ ] A new application can be integrated using the documented contract and application configuration without rewriting the shared identity and access implementation.
- [ ] Initial registration, login, password change, and recovery flows do not require a second authentication factor.

## Validation

During local setup, capture verification and password-reset messages in a local test inbox without external delivery. Use the captured links to exercise the normal flows, including verification, expiry, single use, and session revocation. Real email delivery must be configured before cloud use. See decision [0071](../decisions/0071-local-test-inbox-for-email.md).

When implementation exists, exercise the account and password lifecycle through integration tests and a manual walkthrough. Include negative cases for credential failures, expired/reused recovery proof, session invalidation, unauthorized profile access, and direct calls to protected operations.

Use two minimal application integrations to validate identity reuse and permission isolation. Review credential handling and verify that logs and responses do not disclose secrets. The local identity host covers setup-only administrator creation, reusable invitations, registration, email verification, username/email login, password change/reset, and scoped product access requests and administration. `tests/account-smoke.ps1`, `tests/password-smoke.ps1`, and `tests/access-smoke.ps1` exercise these HTTP flows against SQLite. The campaign OpenID Connect client has a SQLite-backed product session; `tests/oidc-smoke.ps1` checks sign-in, local logout, return sign-in, and optional immediate grant revocation. A Development-only second client and `tests/cross-product-smoke.ps1` verify shared login, independent logout, and grant isolation. `tests/cross-product-password-smoke.ps1` checks password-driven revocation across both products and current-browser silent renewal. `tests/session-smoke.ps1` checks ordinary and remembered cookie behavior. A maintained compromised-password blocklist, interactive browser-close validation, and the remaining acceptance checks are still implementation work.

## Open questions

- Select a maintained common, expected, and compromised-password blocklist source; the current short local list is only an interim safeguard. Finalize remaining session-expiry defaults and abuse-control settings. Password strength and no scheduled expiration are settled by decision [0072](../decisions/0072-password-strength-without-periodic-expiry.md); reset links expire after one hour under decision [0057](../decisions/0057-password-reset-links-expire-after-one-hour.md).
- Complete the OpenID Connect product-session contract, key-transfer/recovery procedure, and cross-product revocation tests. Select real email delivery before cloud use; local capture is implemented under decisions [0071](../decisions/0071-local-test-inbox-for-email.md) and [0074](../decisions/0074-sqlite-local-test-inbox.md).
