# Requirements consistency review

- Date: 2026-09-26
- Scope: specs 001–007, the outstanding-question index, and the relevant accepted decisions.
- Result: settled-rule contradictions corrected; specs remain Draft pending technical proofs and the qualifications below.

## Corrections made from accepted decisions

| Area | Correction | Authority |
| --- | --- | --- |
| Reorder highlight | Moving any participant selects the former active participant's pre-reorder successor; removed conflicting non-active-move example and duplicate acceptance line | 0019 |
| Insertion | New participants first appear immediately before active; later drag is a separate reorder with its own active-selection effect | 0026 |
| Fight removal | Removed stale undecided wording and restricted mob removal to Prepare | 0027 |
| Skip | Added Skip to the list of actions changing the active participant; counters retain their established behavior | 0027 |
| Character references | Replaced tests expecting deletion of referenced characters with rejection tests; current character values still appear in encounters | 0032, 0033 |
| Settled encounter questions | Removed reopened questions about duplicates, ownership, first turns, counters, and history | 0022, 0025, 0030, 0033, 0034 |
| HP | Aligned summary with the exact interval -10 < HP < 0 and allowed initial HP for every category added in Fight | 0026, 0035 and spec 007 R11/R14 |
| Display | Updated screen-sharing text to name Round and individual Turn counters | 0025 |
| Password policy | Replaced stale instruction to define password policy with a reference to the accepted R10a policy | 0072 |

Historical decision records are retained as history. Later accepted decisions resolve open issues mentioned in earlier records; their older wording is not a new question.

## Qualifications before affected behavior is finalized

1. Browser close without Remember me: session cookies may be restored by browser session-restore features. A server cannot reliably detect that every browser process has closed. The implementation must test normal and restored browser sessions and document this limitation. The accepted requirement must not silently be claimed satisfied by merely omitting cookie expiry. Clarify whether normal session-cookie behavior is sufficient before finalizing that acceptance criterion.
2. HP inputs: direct HP explicitly permits numeric values and fractional HP is implied by the strict status interval. Damage/Heal input sign restrictions are not specified. Preserve the stated arithmetic in planning; do not introduce nonnegative-only validation without a recorded choice. No fixed numeric range should be introduced silently.
3. Login identifiers: username-or-email needs a deterministic rule when one account's username resembles another account's email. Normalization and collision prevention remain technical design work, including migration-safe uniqueness constraints.
4. Pending registration: define and test email verification after the original invitation has expired. Invitation validity at registration and verification proof expiry are different concepts; do not accidentally revoke existing grants when the reusable invitation expires.
5. Finished encounters: ordinary encounter commands reject stopped sequences and the UI is view-only. This does not require immutable records or an administrative correction API. Current campaign character values may still change their displayed classification under decision 0032.

These items do not block creating a local scaffold. They must be resolved before their affected acceptance checks are marked complete. No new product choice is recorded as accepted by this review.

## Validation performed

Compared requirements and acceptance examples against the governing decisions and checked documentation links and whitespace. No executable application tests exist or were run. Runtime availability checks on the current Windows machine are setup observations, not Fedora validation. The implementation sequence and technical proofs are in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).
