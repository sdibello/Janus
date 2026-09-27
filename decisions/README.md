# Decision records

Keep durable product, design, technical, and workflow decisions here so their reasons survive beyond a conversation.

Copy TEMPLATE.md to NNNN-short-title.md using the next available number. Mark tentative choices Proposed and made choices Accepted. Include context, alternatives, consequences, and related specs.

When a decision changes, add a new record and mark the old one Superseded with a link to its replacement. Preserve the history. Add each record to this index.

| Record | Status | Summary |
| --- | --- | --- |
| [0001](0001-project-documentation.md) | Accepted | Keep shared AI guidance, specs, and decisions in the repository. |
| [0002](0002-shared-identity-and-access.md) | Accepted | Reuse identity and access across applications; no initial multifactor requirement. |
| [0003](0003-minimal-campaigns.md) | Accepted | Campaigns start with a name, creation date, and PC/NPC lists. |
| [0004](0004-encounter-local-mobs.md) | Accepted | Encounters support PCs, NPCs, and encounter-local mobs. |
| [0005](0005-manual-encounter-turns.md) | Accepted | Advance participants with Next and increment Turn on wraparound; ordering refined by 0006. |
| [0006](0006-initial-initiative-only.md) | Accepted | Initiative sets the original order; drag and drop controls order while running. |
| [0007](0007-dm-login-and-player-display.md) | Accepted | Only the dungeon master logs in initially; support player viewing during play. |
| [0008](0008-screen-sharing-only.md) | Accepted | Use screen sharing this phase; a separate presentation view is a possible future enhancement. |
| [0009](0009-campaign-encounters-and-history.md) | Accepted | Require campaign encounters, allow mobs during play, and retain finished encounters for viewing. |
| [0010](0010-mob-initiative-and-finished-ui.md) | Superseded | Replaced by 0011: phase-specific mob placement; finished UI behavior retained. |
| [0011](0011-prepare-and-fight.md) | Accepted | Prepare sets initiative order; Fight allows manual ordering and mob placement anywhere. |
| [0012](0012-active-participant-selection.md) | Superseded | Replaced by 0019: active selection follows the pre-reorder list. |
| [0013](0013-resume-encounters.md) | Accepted | Restore saved encounter phase, participants, order, active highlight, and counter when Janus reopens. |
| [0014](0014-hit-point-scope.md) | Accepted | Track HP for all participant categories now; status and spell effects are future work. |
| [0015](0015-optional-current-hp.md) | Accepted | HP is optional and current-only; entered damage subtracts from it. |
| [0016](0016-negative-hp-and-unconscious.md) | Accepted | Preserve negative HP and status on reopening; boundary clarified by 0017. |
| [0017](0017-alive-adjacent.md) | Accepted | HP changes update status: Unconscious at -1 through -9, alive adjacent at -10 or below, neither at zero or above. |
| [0018](0018-encounter-specific-hp.md) | Accepted | Enter HP separately per encounter; restore it on return without carrying it between encounters. |
| [0019](0019-active-after-reorder.md) | Accepted | Reorder selects the pre-reorder successor; the DM can set any participant active. |
| [0020](0020-turn-counter-wrap-only.md) | Accepted | Only Next wrapping from last to first increments Round; see 0025 for individual Turn counters. |
| [0021](0021-next-follows-current-order.md) | Accepted | Next always advances in current order; use set-active for exceptions. |
| [0022](0022-place-new-mobs-before-advancing.md) | Accepted | Place new mobs before Next; they use the normal current-order sequence. |
| [0023](0023-manual-initiative-ties.md) | Accepted | DM manually resolves equal initiative order during Prepare. |
| [0024](0024-unbounded-whole-number-initiative.md) | Accepted | Initiative is any whole number, including positive, negative, and zero, without an app-defined range. |
| [0025](0025-round-and-individual-turn-counters.md) | Accepted | Track each participant's turns separately from the Round counter. |
| [0026](0026-add-participants-during-fight.md) | Accepted | Add any participant during Fight immediately before active; then allow reordering. |
| [0027](0027-skip-and-no-removal-during-fight.md) | Accepted | Next counts an individual turn; Skip advances without counting; no Fight removals. |
| [0028](0028-fight-transition-is-one-way.md) | Accepted | Once Fight starts, the encounter cannot return to Prepare. |
| [0029](0029-display-initiative-values.md) | Accepted | Keep recorded initiative visible during Prepare and Fight; it does not govern Fight order. |
| [0030](0030-no-additional-encounter-history.md) | Accepted | Finished encounters show saved state and final counts; no event history is needed now. |
| [0031](0031-no-back-button.md) | Accepted | No Back/undo-turn control; use set-active to correct who acts next. |
| [0032](0032-campaign-character-ownership-and-current-values.md) | Accepted | PCs/NPCs belong to one campaign; encounters display current character values rather than snapshots. |
| [0033](0033-removal-ownership-and-duplicate-names.md) | Accepted | Block removal of referenced characters; restrict management to the creating DM; allow duplicate names. |
| [0034](0034-no-duplicate-participants-and-deferred-maintenance.md) | Accepted | No repeated PC/NPCs in encounters; multiple mobs are individual entries; defer rename/archive/delete. |
| [0035](0035-hp-edit-damage-and-heal.md) | Accepted | Set HP directly; Damage subtracts, Heal adds; both need current HP; decide status colors in prototyping. |
| [0036](0036-username-email-and-verification.md) | Accepted | Sign in with username or email; use email for resets and require verification before access. |
| [0037](0037-invitation-only-registration.md) | Accepted | New users need an invitation to create an account; open registration is disabled. |
| [0038](0038-minimal-account-profile.md) | Accepted | Username and email are the only account profile fields for now. |
| [0039](0039-separate-products-sharing-accounts.md) | Accepted | Future applications are separate products sharing accounts through the same identity system. |
| [0040](0040-single-sign-on-and-local-logout.md) | Accepted | Sign in automatically across authorized products; logout affects only the current product. |
| [0041](0041-automatic-sign-in-after-local-logout.md) | Accepted | Returning after local logout signs the user in automatically while the shared login remains active. |
| [0042](0042-request-and-approve-application-access.md) | Accepted | Users request product access and an administrator approves it; new products do not grant access automatically. |
| [0043](0043-shared-and-product-administrators.md) | Accepted | Shared administrators approve access across products; product administrators approve access for their own product. |
| [0044](0044-no-additional-initial-product-roles.md) | Accepted | No additional roles or custom permissions for the initial campaign product beyond DMs and the agreed administrators. |
| [0045](0045-repeat-access-requests-after-rejection.md) | Accepted | Users can submit another product access request after rejection without permission to request again. |
| [0046](0046-revoke-access-and-allow-new-requests.md) | Accepted | Administrators can revoke product access; affected users can request access again, subject to approval. |
| [0047](0047-registration-invitation-grants-product-access.md) | Accepted | Registration invitations grant access to the invited product after registration and email verification, without a separate request. |
| [0048](0048-shared-access-request-portal.md) | Accepted | One shared portal handles access requests and reviews, showing administrators only what they can manage. |
| [0049](0049-shared-administrators-appoint-administrators.md) | Accepted | Only shared administrators can appoint shared or product administrators. |
| [0050](0050-first-shared-administrator-during-setup.md) | Accepted | Designate the first shared administrator during deployment or setup, with no public setup page. |
| [0051](0051-shared-and-product-administrators-issue-invitations.md) | Accepted | Shared administrators invite users to any product; product administrators invite users only to their own product. |
| [0052](0052-reusable-registration-invitations.md) | Accepted | Registration invitation links are reusable by multiple people and are not tied to one recipient email address. |
| [0053](0053-invitations-expire-after-24-hours.md) | Accepted | Reusable registration invitations expire 24 hours after issuance; reuse does not extend validity. |
| [0054](0054-password-changes-and-session-revocation.md) | Accepted | Password reset signs out all sessions; authenticated password change renews the current session and signs out all others. |
| [0055](0055-remember-me-for-persistent-login.md) | Accepted | Login persists after browser closure only when the user selects Remember me; duration remains open. |
| [0056](0056-remember-me-30-days-since-activity.md) | Accepted | Remembered login expires after 30 days without user activity; activity renews the period. |
| [0057](0057-password-reset-links-expire-after-one-hour.md) | Accepted | Single-use password-reset links expire one hour after issuance. |
| [0058](0058-desktop-and-laptop-initial-support.md) | Accepted | The first release supports desktop and laptop computers only; tablet and phone support are outside scope. |
| [0059](0059-internet-required-for-first-release.md) | Accepted | The first release requires an internet connection; offline operation is outside scope. |
| [0060](0060-all-agreed-features-in-first-release.md) | Accepted | The first usable release includes all agreed features across specs 001 through 007. |
| [0061](0061-local-setup-then-cloud-hosting.md) | Accepted | Run locally for initial setup and validation, with cloud hosting as the long-term target. |
| [0062](0062-windows-and-fedora-local-support.md) | Accepted | Local setup and operation must support both Windows and Fedora Linux. |
| [0063](0063-react-typescript-and-aspnet-core.md) | Accepted | Use React with TypeScript for the frontend and ASP.NET Core with C# for the backend API. |
| [0064](0064-sqlite-for-initial-local-use.md) | Accepted | Use SQLite initially for local operation; revisit the database before cloud deployment. |
| [0065](0065-manual-local-database-transfer.md) | Accepted | Manually transfer the SQLite database between Windows and Fedora; no sharing or synchronization feature is required. |
| [0066](0066-entity-framework-core-and-vite.md) | Accepted | Use Entity Framework Core for database access and migrations, and Vite for frontend development and builds. |
| [0067](0067-self-hosted-identity-and-openiddict.md) | Accepted | Host ASP.NET Core Identity and OpenIddict locally initially, using OpenID Connect across products; move to cloud hosting later. |
| [0068](0068-defer-cloud-selection-until-local-app-works.md) | Accepted | Defer cloud provider and database selection until the local application is working. |
| [0069](0069-windows-11-and-fedora-test-priority.md) | Accepted | Support Windows 11 and prioritize Fedora testing; the Fedora release remains unconfirmed. |
| [0070](0070-latest-stable-fedora-target.md) | Accepted | Target the latest stable Fedora release and record the concrete version during setup and validation. |
| [0071](0071-local-test-inbox-for-email.md) | Accepted | Capture verification and password-reset emails in a local test inbox during setup instead of sending real email. |
| [0072](0072-password-strength-without-periodic-expiry.md) | Accepted | Use a NIST-based password-strength baseline without scheduled password expiration. |
| [0073](0073-local-hosts-and-migration-ownership.md) | Accepted | Two local hosts share SQLite with separate EF Core contexts and migration histories; Vite serves two entry pages. |
| [0074](0074-sqlite-local-test-inbox.md) | Accepted for local development | Capture verification messages in SQLite and expose a Development-only loopback inbox. |
| [0075](0075-interactive-first-administrator-setup.md) | Accepted for local setup | Create the first shared administrator through an interactive setup command, then verify email. |
