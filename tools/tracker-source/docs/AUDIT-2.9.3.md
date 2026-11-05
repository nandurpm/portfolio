# Cross-platform audit — 5 November 2026

## Scope and evidence boundaries
Inspected latest upstream source (9a6105c), clean working changes, open PRs/issues (none), releases and workflow state. Preserved newer upstream keyboard shortcut/help changes and approved Android 2.9.x layout. Shared React/TypeScript/Vite source; Electron Windows shell; Capacitor Android shell. Synthetic fixture browser testing is distinct from authenticated production testing and physical packaged-app testing.

## Confirmed findings and fixes

| Severity | Finding / root cause | Resolution |
| --- | --- | --- |
| Medium | Tab route mount waited behind AnimatePresence mode=wait and an outgoing fade; code fetched only after first navigation | Mount immediately, keep incoming animation; share retryable import promises; preload on focus/pointer intent and warm three frequent destinations sequentially after startup |
| Medium | Progress calculated identical historical cumulative cash for every future row although recordedCash was null | Skip unused future historical scans; keep planned rows, future nulls and all displayed results |
| Low | cumulative calculated the identical ledger period multiple times | Reuse one result; no arithmetic or rounding policy changes |
| Operational | Recent Android-only releases left Windows on its previous binary | Restore both native release targets for 2.9.3 |

Local calculation benchmark (10 runs per case, synthetic fixture): 98 rows 15.56ms -> 1.31ms; 600 rows 447.36ms -> 5.62ms. Before/after progress arrays deep-compared equal in both cases. These are calculation timings on the build host, not a promise about physical-device navigation latency.

## Financial/data audit
Existing deterministic tests cover income, expenses, savings, opening balances, full monthly budgets, account ledgers, internal transfers, assets/liabilities/net worth, linked loan receipts, advance EMI vs due dates, PF cash transfers, provisions, payment cutoffs, formatting and date boundaries. Added future-horizon equivalence regression; calculation formulas and data schemas remain unchanged. Rebuilt the bot finance bundle to retain shared calculation parity.

Reviewed sync's permanent-ID merge, conflict review, revision locking, owner-scoped queries, idempotency mutation keys, signed-out cache isolation and native upgrade/account isolation tests. Production queries were metadata-only; no financial records were read, reset or modified.

## Production security review
Supabase project ACTIVE_HEALTHY. Read live policies and save-RPC definition. tracker_save_plan deliberately uses SECURITY DEFINER with an empty search_path, authenticated JWT owner, owner-scoped row lock, revision comparison and idempotency; removing it blindly would break the controlled writer architecture. RLS-enabled bot tables without public policies intentionally deny client access. Advisor init-plan warnings are not sufficient evidence for a migration: inspected policy expressions already use scalar subqueries. No access was widened, indexes dropped or production DDL applied.

Outstanding: leaked-password protection is disabled. No supported Auth-setting mutation capability is exposed in the current connector. Enable through the project Auth configuration if available on its plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Immediate Telegram release check lacks TRACKER_BOT_CRON_SECRET in GitHub; existing scheduled checks remain fallback. Cannot safely invent or expose the credential. Delivery is not claimed verified.

## UI, accessibility and runtime coverage
Browser suite covers desktop/mobile navigation, forms, Accounts scroll/position, Dashboard, filters/date ranges, reports/export/import, appearance palettes, light/dark mode, Android More, font scaling, narrow widths, auth/recovery, updates and accessibility. Added animation-enabled tab-switch tests with unchanged synthetic records and timing attachments. Approved design and upstream shortcuts remain intact. Native builds/tests and disposable Supabase/database tests run in CI.

Live website observed at the actual domain: sign-in screen rendered after startup. No authenticated session was available; production finance screen interactions and real-user reconnection/conflict scenarios were not executed. Connected browser extension timed out; cloud browser used for public startup inspection only.

## Verification and release record
See PR, CI logs and release assets for final test counts/build results. Source checks are not evidence of physical Windows execution or Android installation. Required manual checks: Windows EXE startup/update/tray/file dialogs; Android signed upgrade retaining data, keyboard/insets/system Back/native picker, and real authenticated offline/reconnect sync. Existing update checksum verification and signing-identity continuity checks are retained. Workflows serve distinct build/quality/release/content functions; none was proven redundant, so none was removed.
