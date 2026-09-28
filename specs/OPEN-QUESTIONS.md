# Requirements review: outstanding questions

Last reviewed: 2026-09-27.

The planned user-facing questionnaire is complete. A consistency review corrected stale contradictions and identified qualifications that must be resolved before affected behavior is finalized. See [REQUIREMENTS-REVIEW.md](REQUIREMENTS-REVIEW.md) and [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md). Technical items below remain open until implemented or validated; proposals are not accepted product decisions.

## Handoff

Accepted decisions run through 0078. The next executable task is the remaining implementation-plan step 3 cross-product session work. The Windows foundation and encounter Prepare/Fight/HP workflows have been built and smoke-tested with .NET SDK 10.0.202, Node 24.14.1, and npm 11.11.0. Fedora has not been tested. Cloud choices remain deferred.

Before finalizing the relevant workflows, resolve the remaining review qualifications: browser session restoration without Remember me, identifier collisions, and verification after invitation expiry. Close/reopen checks passed for ordinary and remembered login in headless Chrome and Edge on Windows with default settings; browser session-restoration settings remain untested. The local HP implementation accepts signed decimal Damage/Heal amounts and applies the stated subtraction/addition exactly, without adding a sign restriction. Do not reopen settled encounter rules. Resume with [the implementation plan](IMPLEMENTATION-PLAN.md).


## Confirmed context: do not ask again

- Only the dungeon master logs in initially. Players watch the existing UI through external screen sharing. A separate presentation view is future work.
- Every encounter belongs to a campaign; its PCs/NPCs are selected from that campaign. Mobs exist only within their encounter.
- Prepare records initiative and sets initial order. Fight allows drag-and-drop ordering and adding mobs at any chosen position without initiative.
- Only Next wrapping from the last participant to the first increments Round; each Next also increments the active participant’s individual Turn counter. Reordering, insertion, or manual active selection changes neither counter.
- Adding a participant leaves the active highlight unchanged. After reordering, the active participant becomes the old active participant's successor from the pre-reorder list. The DM can also select any participant active; see decision [0019](../decisions/0019-active-after-reorder.md).
- Reopening restores saved encounter progress. Finished encounters remain viewable; their UI does not facilitate modification, but immutable storage is not required.
- HP is optional, current-only, entered separately for each encounter, and never carried between encounters. Returning to the same encounter restores its saved HP and status.
- Damage subtracts from HP, preserving negative values. HP strictly between -10 and 0 means Unconscious; HP at or below -10 means alive adjacent. Raising HP updates the status, clearing these statuses at zero or above. Statuses persist on return.
- Both statuses stay in normal turn order and are not skipped automatically. Other statuses and spell effects remain deferred.
- Users sign in with username or email, reset passwords by email, and must verify email before access. New accounts require an invitation. No multifactor authentication is required in the initial phase.

## Turn flow and encounter lifecycle

Sources: [004](004-initiative-and-turn-sequence.md), [005](005-manual-encounter-order.md).

- [x] **Q01 — Next after reordering:** Resolved by decision [0021](../decisions/0021-next-follows-current-order.md). Next always advances to the next participant in the current order. Use the set-active control for exceptions.
- [x] **Q02 — New mob's first turn:** Resolved by decision [0022](../decisions/0022-place-new-mobs-before-advancing.md). Place the mob in the desired order position, or drag it there before Next. It takes a turn when ordinary traversal reaches it; if placed before the active participant, it is reached after wraparound.
- [x] **Q03 — Moving the active participant:** Superseded by decision [0019](../decisions/0019-active-after-reorder.md). After any reorder, use the next participant after the old active one in the pre-reorder list; if the active one was last, wrap to the old first. The DM can select any participant active directly. Reordering and manual selection leave Turn unchanged.
- [x] **Q04 — Cancel or interruption:** The three-choice prompt was removed. Completed reorder/active-selection state is restored on reopen under decision [0013](../decisions/0013-resume-encounters.md).
- [x] **Q05 — Initial order:** Highest initiative first; the DM resolves tied initiatives manually during Prepare. See decision [0023](../decisions/0023-manual-initiative-ties.md).
- [x] **Q06 — Initiative values:** Whole numbers, positive, negative, or zero, with no application-defined limit. See decision [0024](../decisions/0024-unbounded-whole-number-initiative.md).
- [x] **Q07 — Starting and finished counter values:** Confirmed. Encounters start at Round 1, each participant starts at Turn 0, and finished encounters retain and display final counts. See decision [0025](../decisions/0025-round-and-individual-turn-counters.md).
- [x] **Q08 — Adding participants during Fight:** Resolved by decision [0026](../decisions/0026-add-participants-during-fight.md). The DM can add PCs/NPCs from the campaign or encounter-local mobs at any time. Each is inserted immediately before the active participant; the DM may then drag it elsewhere.
- [x] **Q09 — Removing participants during Fight:** Resolved by decision [0027](../decisions/0027-skip-and-no-removal-during-fight.md). Participants cannot be removed during this phase; use Skip to pass a turn while keeping the participant in the order.
- [x] **Q10 — Returning to Prepare:** Resolved by decision [0028](../decisions/0028-fight-transition-is-one-way.md). Once Fight starts, the encounter cannot return to Prepare.
- [x] **Q11 — Initiative visibility:** Resolved by decision [0029](../decisions/0029-display-initiative-values.md). Display recorded initiative throughout Prepare and Fight; manual order controls Fight progression.
- [x] **Q12 — Finished encounter history:** Resolved by decision [0030](../decisions/0030-no-additional-encounter-history.md). Saved encounter contents and final counters are sufficient; no additional event history is needed at this time.
- [x] **Q13 — Mistakes:** Resolved by decision [0031](../decisions/0031-no-back-button.md). Do not provide a Back/undo-turn button in this phase. The DM can set the intended participant active; counters are not corrected automatically.

## Campaigns and characters

Sources: [002](002-campaigns-and-characters.md), [003](003-encounters-and-participants.md).

- [x] **Q14 — Character reuse:** Resolved by decision [0032](../decisions/0032-campaign-character-ownership-and-current-values.md). Each PC/NPC belongs to one campaign and cannot be reused in another.
- [x] **Q15 — Character changes and history:** Resolved by decision [0032](../decisions/0032-campaign-character-ownership-and-current-values.md). Encounters show current PC/NPC values; character edits appear wherever that character is used. No snapshot is kept.
- [x] **Q15a — Removing a campaign character:** Resolved by decision [0033](../decisions/0033-removal-ownership-and-duplicate-names.md). A PC/NPC cannot be removed from its campaign while it belongs to any encounter.
- [x] **Q16 — Ownership:** Resolved by decision [0033](../decisions/0033-removal-ownership-and-duplicate-names.md). Only the creating DM can manage the campaign, its characters, and its encounters.
- [x] **Q17 — Creation date:** Resolved by decision [0033](../decisions/0033-removal-ownership-and-duplicate-names.md). The campaign creation date is the date it was created, assigned automatically.
- [x] **Q18 — Naming:** Resolved by decision [0033](../decisions/0033-removal-ownership-and-duplicate-names.md). Duplicate names are allowed; campaign, encounter, and character names must be nonblank.
- [x] **Q19 — Repeated participants:** Resolved by decision [0034](../decisions/0034-no-duplicate-participants-and-deferred-maintenance.md). A PC/NPC appears at most once per encounter. Multiple same-name mobs are separate entries created during Prepare, not a group.
- [x] **Q20 — Campaign maintenance:** Resolved by decision [0034](../decisions/0034-no-duplicate-participants-and-deferred-maintenance.md). Character, mob, campaign, and encounter renaming, plus archiving and deletion, are deferred; they are not needed in the current scope.

## HP and visual status

Source: [007](007-hit-point-tracking.md).

- [x] **Q21 — HP adjustment:** Resolved by decision [0035](../decisions/0035-hp-edit-damage-and-heal.md). HP can be directly set to any positive or negative numeric value. Damage subtracts from HP; Heal adds to it.
- [x] **Q22 — Missing HP:** Resolved by decision [0035](../decisions/0035-hp-edit-damage-and-heal.md). Damage and Heal are unavailable until current HP is set; HP remains optional.
- [x] **Q23 — Status colors:** Color choices will be handled during UI prototyping. See decision [0035](../decisions/0035-hp-edit-damage-and-heal.md); keep status identification clear alongside the active-turn highlight.

## Accounts and future applications

Source: [001](001-shared-identity-and-access.md).

- [x] **Q24 — Sign-in and recovery:** Resolved by decision [0036](../decisions/0036-username-email-and-verification.md). Sign in with username or email; password resets use email; email verification is required before access.
- [x] **Q25 — Registration policy:** Resolved by decision [0037](../decisions/0037-invitation-only-registration.md). A new user must have an invitation to create an account.
- [x] **Q25a — Profile fields:** Resolved by decision [0038](../decisions/0038-minimal-account-profile.md). Username and email address are the only account profile fields needed for now.
- [x] **Q26 — Application meaning:** Resolved by decision [0039](../decisions/0039-separate-products-sharing-accounts.md). Future applications are separate products sharing accounts through the same identity system.
- [x] **Q27 — Cross-application sessions:** Resolved by decision [0040](../decisions/0040-single-sign-on-and-local-logout.md). Existing login signs users into other authorized products automatically; logout affects only the current product.
- [x] **Q27a — Return after logout:** Resolved by decision [0041](../decisions/0041-automatic-sign-in-after-local-logout.md). Returning signs the user in automatically if the shared login remains active and application access remains authorized.
- [x] **Q28 — Access grants:** Resolved by decision [0042](../decisions/0042-request-and-approve-application-access.md). Users request product access and an administrator approves it; existing accounts do not automatically receive access to new products.
- [x] **Q28a — Approval administrators:** Resolved by decision [0043](../decisions/0043-shared-and-product-administrators.md). Shared administrators manage access approvals across all products; product administrators manage approvals for their own product.
- [x] **Q28b — Roles and permissions:** Resolved by decision [0044](../decisions/0044-no-additional-initial-product-roles.md). No additional roles or custom permissions are needed for the initial campaign product beyond approved DMs and the agreed administrators.
- [x] **Q28c — Rejected access requests:** Resolved by decision [0045](../decisions/0045-repeat-access-requests-after-rejection.md). Users can submit another request after rejection without permission to request again; approval is still required for access. Remaining lifecycle questions are split out below.
- [x] **Q28c1 — Access revocation:** Resolved by decision [0046](../decisions/0046-revoke-access-and-allow-new-requests.md). Administrators can revoke approved product access within their scope; affected users can request access again, with approval required to restore access.
- [x] **Q28c2 — Invitation access:** Resolved by decision [0047](../decisions/0047-registration-invitation-grants-product-access.md). Accepting a valid invitation, completing registration, and verifying email grants access to the invited product without a separate request or approval.
- [x] **Q28c3 — Request review interface:** Resolved by decision [0048](../decisions/0048-shared-access-request-portal.md). One shared portal handles requests and reviews across products, showing administrators only what they are authorized to manage.
- [x] **Q28d — Administrator assignment:** Resolved by decision [0049](../decisions/0049-shared-administrators-appoint-administrators.md). Only shared administrators can appoint shared or product administrators.
- [x] **Q28d1 — First shared administrator:** Resolved by decision [0050](../decisions/0050-first-shared-administrator-during-setup.md). Designate the first shared administrator account during deployment or setup, with no public setup page.
- [x] **Q28e — Invitation issuers:** Resolved by decision [0051](../decisions/0051-shared-and-product-administrators-issue-invitations.md). Shared administrators can invite users to any product; product administrators can invite users only to their own product.
- [x] **Q28e1 — Invitation reuse and recipients:** Resolved by decision [0052](../decisions/0052-reusable-registration-invitations.md). Invitation links are reusable by multiple people, are not tied to one recipient email address, and are not consumed by registration.
- [x] **Q28e2 — Invitation expiry:** Resolved by decision [0053](../decisions/0053-invitations-expire-after-24-hours.md). Reusable invitation links expire 24 hours after issuance; reuse does not extend validity.
- [x] **Q29 — Password/session behavior:** Resolved by decision [0054](../decisions/0054-password-changes-and-session-revocation.md). Password reset signs out all existing sessions across products and devices; authenticated password change renews the current session and signs out all others.
- [x] **Q29a — Browser persistence:** Resolved by decision [0055](../decisions/0055-remember-me-for-persistent-login.md). Login persists after closing and reopening the browser only when the user selects Remember me.
- [x] **Q29a1 — Remember me duration:** Resolved by decision [0056](../decisions/0056-remember-me-30-days-since-activity.md). Remembered login lasts 30 days since last user activity, renewed by activity while still valid. Other session expiry defaults remain under T02.
- [x] **Q29b — Reset-link expiry:** Resolved by decision [0057](../decisions/0057-password-reset-links-expire-after-one-hour.md). Password-reset links expire one hour after issuance and remain single-use.

## Release expectations and implementation follow-up

Answered items below record accepted release requirements. Unchecked technical follow-ups remain unresolved and do not establish additional requirements.

- [x] **Q30 — Devices:** Resolved by decision [0058](../decisions/0058-desktop-and-laptop-initial-support.md). Desktop and laptop computers only for the first release.
- [x] **Q30a — Connectivity:** Resolved by decision [0059](../decisions/0059-internet-required-for-first-release.md). An internet connection is required; offline operation is outside the first-release scope.
- [x] **Q31 — Release scope:** Resolved by decision [0060](../decisions/0060-all-agreed-features-in-first-release.md). The first usable release includes all agreed features across specs 001 through 007; previously deferred features remain outside scope.
- [x] **T01 — Deployment direction:** Resolved by decision [0061](../decisions/0061-local-setup-then-cloud-hosting.md). Run locally for initial setup and validation; cloud hosting is the long-term target.
- [x] **T01a — Local environment and frontend/backend:** Windows and Fedora local support is accepted in decision [0062](../decisions/0062-windows-and-fedora-local-support.md). React with TypeScript and an ASP.NET Core C# API are accepted in decision [0063](../decisions/0063-react-typescript-and-aspnet-core.md).
- [x] **T01a1 — Initial database:** Resolved by decision [0064](../decisions/0064-sqlite-for-initial-local-use.md). Use SQLite initially and revisit the database before cloud deployment.
- [x] **T01a1a — Data across local machines:** Resolved by decision [0065](../decisions/0065-manual-local-database-transfer.md). Manual SQLite database transfer is sufficient; no sharing or synchronization feature is required.
- [x] **T01a2 — Implementation tooling:** Resolved by decision [0066](../decisions/0066-entity-framework-core-and-vite.md). Use Entity Framework Core for data access and schema migrations and Vite for frontend development and builds.
- [x] **T01b — Identity integration:** Resolved by decision [0067](../decisions/0067-self-hosted-identity-and-openiddict.md). Use ASP.NET Core Identity and OpenIddict with OpenID Connect, hosted locally initially and moved to the cloud later.
- [x] **T01c — Cloud selection timing:** Resolved by decision [0068](../decisions/0068-defer-cloud-selection-until-local-app-works.md). Defer cloud provider and database selection until the local application is working; no provider or cloud database has been selected.
- [ ] **T01d — Versions and setup:** Target Windows 11 and the latest stable Fedora, with Fedora as the primary test platform, under decisions [0069](../decisions/0069-windows-11-and-fedora-test-priority.md) and [0070](../decisions/0070-latest-stable-fedora-target.md). During implementation planning, verify the concrete Fedora release and select compatible runtime and dependency versions; no further user confirmation of the installed release is required.
- [x] **T01e — Local email delivery:** Resolved by decision [0071](../decisions/0071-local-test-inbox-for-email.md). Capture verification and password-reset email in a local test inbox; do not send real email during local setup.
- [ ] **T01e1 — Identity operations:** Define service layout, key management, and the local test-inbox tool during implementation planning. Configure real email delivery before cloud use.
- [x] **T02 — Password policy:** Resolved by decision [0072](../decisions/0072-password-strength-without-periodic-expiry.md). Apply a NIST-based strength baseline: 15-character minimum, support at least 64 characters, blocklist checks, passphrases and password managers, no mandatory character mixtures, and no scheduled password expiration.
- [ ] **T02a — Remaining security configuration:** Select the password blocklist mechanism, remaining session defaults, and abuse controls during implementation planning. Preserve the agreed Remember me duration, invitation expiry, and reset-link expiry.

## Review housekeeping

Deferred cloud follow-up: once the local application is working, select the cloud provider and database and define deployment and local-data migration needs before cloud rollout.

This consolidated list removes duplicates and does not reopen confirmed answers. HP is optional and encounter-specific; missing HP prevents arithmetic Damage and Heal actions, while zero HP leaves encounter membership and turn progression unchanged.

All specs remain Draft. Prior accepted product decisions still apply; proposed edge cases must not be treated as approved merely because they appear in an acceptance example. The local identity, campaign, and encounter Prepare/Fight/HP foundations now have executable smoke tests; browser and Fedora validation remain.
