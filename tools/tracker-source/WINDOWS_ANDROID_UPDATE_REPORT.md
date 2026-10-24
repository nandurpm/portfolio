# Windows / Android tracker update — 24 October 2026

## Review decision

**Version 1.6.0 is built for review. It has not been installed over the owner's applications, published, uploaded or distributed. Production Supabase configuration and financial records were not changed.**

The Android APK is signed with the existing replacement-release identity. The Windows installer is **unsigned (no Authenticode certificate available)**. Actual Android installation and real native account/provider authentication remain blocked pending a connected device and an authorized disposable account. Do not interpret the successful automated tests as completion of those checks.

## Verified source and baseline

- Repository: `nandurpm/portfolio`, latest main inspected before work: `043c70f241a96bf03c731a18b346ca2159dcf477` (`Build sign-in-required tracker assets`).
- Its parent is the PR #32 merge: `14abf9c36150d3b1507fa7f4afb543aab9a4329f`, merging `03bd84b1cf47dc9db9100bf3f13d1eda2d50abf6` into `4f46496c1f37962c02f2f0ba4d4a41798622552e`.
- Working branch: `native/verified-web-20261024`.
- **Exact artifact source commit: `21f7930fe812dca8eb6b213212979da4a6ad3fe9`.** Tracker source tree: `8d9c4709f2855d7b3aa0209db7a55223498815a1`. Build reports clean source, Node 24.19.0 and lockfile SHA-256 `b8b92106147e52ccaab5953c0b233a52ed0fdce324bdab41f04f45889cb1b107`.
- Subsequent documentation commits do not change the artifact source. The delivered source checkout retains the exact artifact commit in its history.
- Existing native source was found in `PROJECTS/Savings-and-Expense-Tracker-1.5.1/Source code`, including Electron and Android Java/platform projects. It was a non-Git source snapshot, so no native Git commit can honestly be assigned to it. Its package hash and identifiers are recorded in `docs/audit/native/baseline.json`.
- The previous portfolio checkout had uncommitted work. It was preserved; implementation used a separate Git worktree. Previous source, installers, APKs and installed files were left intact for rollback.
- Read the implementation, pending verification, security, safety/rollback and proposed integrity SQL reports. Opened the live `/track/` page: the private email/password sign-in screen was visible. No private account login was attempted.

## Native integration and changed files

The latest shared React/domain/store/cloud/IO implementation is used directly. Existing Electron `main`, preload, atomic JSON storage, OAuth loopback, secure session paths, Inno installer identity and Android Java bridge, manifest, insets, Keystore sessions and snapshot backup code were retained. This is a port of the native integrations into the verified source, not a replacement application framework.

- `electron/`, `android/`, `capacitor.config.ts`: complete retained platform projects; Windows callback validation additionally rejects malformed/duplicate code and token-bearing callbacks without consuming the listener.
- `src/App.tsx`, `src/pages/Settings.tsx`: suppress routine “Saved locally” messages in desktop chrome, mobile More and Settings; retain save failures, recovery warnings and pending/conflict status. Backup timestamps remain available.
- `src/cloud/client.ts`: enable automatic native token refresh; secure native credential storage remains unchanged.
- `src/cloud/sync.ts`: bind database requests to the starting session token; abort initial linking after an account changes during backup; lock the preserved workspace immediately after sign-out. No financial records are erased to accomplish logout.
- `vite.config.ts`: native release manifest with exact source/build identity and asset hashes; native builds retain native mode and relative routes. Web sign-in gates, browser-storage clearing and web-only routes were not forced into native builds.
- `package.json`, native build/verification scripts, `build/`, licenses, `README-NATIVE.md`: restored established native packaging and documented reproducible builds. Version 1.5.1 → 1.6.0; Electron 44.7.2 → 44.9.3.
- Native regression tests cover storage/recovery, mobile bridge, secure session paths, loopback callbacks, account isolation and the financial upgrade contract. Full changed-file list accompanies this report.

## Requirement status

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Routine save messages; actionable save/sync warnings | Fixed | Native conditions corrected; packaged Windows Settings checked; mobile More exercised in responsive harness. |
| Platform Settings; readable rupee chart amounts; date format | Fixed | Verified shared implementation retained; native Windows Settings and responsive/accessibility checks passed. |
| 12-month default display, full configured plan, separate original range, forecast/custom presets | Fixed | Shared range migration and tests retained. Display migration does not truncate financial plan or entries. |
| Receipt validation on load/import/restore and outside-period liability/cash distinction | Fixed | Shared validators/history/archive/IO retained and tested in native persistence. |
| Optional-collection concurrent merge; explicit edit/delete resolution | Fixed | Shared ID-based merge retained; independent edits/conflicts covered by tests. |
| Reconciliation and provisions persistence | Fixed | Native JSON and XLSX tests preserve known fields, IDs, overrides and linked receipts. No records/configuration were recreated in the real account. |
| Keyboard access, contrast, Loan closure memoization | Fixed | Verified shared UI retained; accessibility/browser tests passed. Android physical-device visual check remains pending. |
| About source/version/build identity | Fixed | Visible in packaged Windows Settings; matching manifests verified inside Windows archive and APK. |
| Duplicate TrackerNative registration | Not Reproducible | Exactly one shared TypeScript proxy and one Android Java registration; generated plugin list contains Capacitor App only. No legitimate platform registration was removed. |
| Native account cache isolation/logout | Partially Fixed | Workspace locks on logout/wrong account; preserved data cannot be uploaded through a switched account. Engine regressions pass. Real installed account/session expiry checks remain unverified. |
| Native email/password, token refresh/expiry, Google provider | Blocked | No authorized disposable account was supplied; no Android device is connected. Callback and engine tests use synthetic/mocked sessions, not Google. |
| Android deep-link handling and system bars | Partially Fixed | Existing manifest/Java handlers retained and compiled. Real deep-link lifecycle, provider return and instrumentation tests need a device. |
| Production PR #32 integrity guard | Deferred | Read-only metadata confirms **not deployed**. Separate production approval is required. |
| Mixed old-client cloud compatibility | Partially Fixed | New clients preserve known fields and pause on detected omissions; unupdated older clients can still omit them without the proposed server guard. Update all clients before resuming edits. |
| Installer in-place upgrade / Android install-over | Blocked | Windows same-profile executable rehearsal passed. Actual installation over the owner's app was deliberately not performed; no disposable Windows installation environment or Android device available. |
| Signed Windows release | Blocked | Existing Windows release is unsigned; no authorized signing certificate available. Installer is explicitly unsigned. |
| Android release signing | Fixed | Same package ID and certificate as the previous 1.5.1 APK, versionCode 10501 → 10600. |
| Android lint warnings / Gradle deprecations | Deferred | Lint succeeds with 0 errors, 22 app warnings (preferences, generated resources/icons, backup metadata and newer-tool notices); vendor dependency baselines also report hints. Gradle 9 migration is outside this preserved toolchain update. |

## Financial behavior and before/after explanation

No additional financial formula changes were made beyond adopting the verified shared source. Native-specific fixes concern presentation, authentication and packaging.

- Older native validation did not include the verified archive/receipt protections and newer optional records. The port now retains out-of-plan receipts in the lifetime liability ledger, excludes their cash from the configured cash period, and validates links during load/import/restore. Opening cash must already reflect cash paid before the plan starts.
- A synthetic phone loan of ₹20,000 financed, 12 × ₹2,000, first due **05-Nov-2026**, paid **20-Oct-2026**, has one receipt and a settled first liability. November actual cash does not charge that receipt again. When previous-month EMI planning is enabled, November may still plan the **December** installment; that is a different liability, not a duplicate November charge.
- The December installment paid **10-Nov-2026** is linked to December's liability and November's actual cash. The recurring pattern of paying on the 10th for the following month's 5th is covered. The January installment paid 10 December remains a separate payment.
- Existing tests cover partial payments, late/post-plan payments, duplicate/excess rejection, editing/deleting/undo, leap/month-end dates, historical actuals versus forecasts, salary receipt-month raises and negative/positive cash carry-forward. Actual entries remain actuals; expected forecast amounts are not inserted as transactions.
- Default visible range is now 12 months; “Full plan” uses current configured start/end, and “Original imported range” remains separate. Financial plan dates and archived entries are preserved.
- Provisions are earmarks, not extra spending or transfers. Synthetic electricity configuration reserves ₹150 on the 10th from November, includes a **one-time ₹50 opening reserve**, and expects ₹300 every two months beginning **25-Dec-2026**. Reserve is ₹200 on 10 November and ₹350 on 10 December before payments; allocation itself creates no expense. Actual bill payments count once; explicit overrides retain priority.
- Reconciliation preserves bank-plus-physical-cash comparisons and does not create an adjustment or invent a future statement closing balance. There is no new heuristic that reclassifies existing records or double-counts internal withdrawals as extra transactions. Users must continue to classify spending correctly; this update does not infer transfers from message text.

## Tests actually performed

| Check | Result |
| --- | --- |
| Vitest | **107 passed, 18 files**; native storage/bridge, callbacks, synthetic financial and account-switch cases included. |
| TypeScript | Main build type check and stricter `typecheck:quality` passed. |
| ESLint | Shared source/tests passed; retained Electron source also checked. |
| Dependency audit | 0 known vulnerabilities at audit time. Deprecation notices are recorded separately from vulnerability results. |
| Web production build + bundle/manifest checks | Passed. No web deployment performed. |
| Native release build | Passed, clean source commit recorded above. |
| Browser responsive/accessibility/gate harness | **14 passed**, Chrome 155.0.8059.86; widths include 320/360/390/393/768/1366/1920. Gate tests mock HTTP and are not native Auth/RLS/provider evidence. |
| Windows packaged launch | App 1.6.0, Electron 44.9.3, embedded Node 24.22.0, Windows 11 build 26300; zero seeded entries/salary/opening and no overflow at 800/900/1024/1100/1366. |
| Windows Settings | Build `21f7930fe812` visible, routine Saved locally hidden; disposable profile screenshot retained. |
| Windows upgrade rehearsal | Existing 1.5.1 executable (Electron 44.7.2 / embedded Node 24.21.0), then 1.6.0, same disposable synthetic profile: financial plan, receipt IDs/dates, audit and undo preserved. **Not an installer upgrade test.** |
| Android Java unit tests | **3 passed**, no failures/errors. |
| Android lint | Passed, 0 errors / 22 app warnings. |
| Android release packaging | Passed, JDK 21.0.12.1, Gradle 8.14.3, Android Build Tools 36.0.0, min 34 / target & compile 36. |
| APK verification | APK Signature Scheme v2 verified, zip alignment verified, package/version inspected. |
| Source/asset integrity | All **80 manifest assets** verified inside each Windows app archive and Android APK; identical clean source identity. |
| Native JSON / XLSX / CSV | Synthetic full JSON backup/restore and older backup restore tests pass; XLSX metadata preserves full-plan/out-of-view/optional/receipt records. CSV supported entry round trip passes; CSV is not a full-plan backup format. |
| Offline/retry/concurrent behavior | Engine/storage tests exercise failed saves, retry, merging independent additions, duplicate handling and explicit conflicts. Physical Windows↔Android concurrent cloud editing and interrupted real-device upgrades remain unverified. |

Build host Node is pinned **24.19.0**, downloaded from the official Node distribution with the published archive SHA-256 verified. Electron embeds its own Node version; that difference is expected.

## Data safety and production verification

- Before native upgrade rehearsal, created `Savings-Tracker-Private/Financial-Backups/Before-1.6.0-20261024.json`. The full existing Windows envelope validates in the new loader, the backup is byte-identical, and the original profile was not rewritten. No production data is included in source, test fixtures or artifacts.
- All mutation/destructive tests used disposable directories and synthetic fixtures. Existing installed binaries were only launched with an isolated profile override, never replaced or uninstalled.
- Production queries inspected trigger/function/role/RLS metadata only. No user financial rows were selected. `tracker_preserve_optional_fields` is absent and no user-defined `tracker_plans` trigger exists.
- Existing `tracker_save_plan` uses JWT-subject ownership, expected revisions, mutation IDs, advisory/row locks and linked payment totals. Its SECURITY DEFINER owner `tracker_plan_writer` is NOLOGIN and does not bypass RLS; RLS is enabled. This is not proof that the additional proposed compatibility guard is deployed.
- Advisors still flag the intentionally exposed save RPC and disabled leaked-password protection. Neither setting was changed. No production schema, grants, policies or Auth settings were modified.
- Windows credentials use Electron safeStorage; Android uses Android Keystore AES-GCM. No password, private key, token or service-role credential was embedded or committed. Native Google flow remains external-browser PKCE with existing platform callbacks.

## Artifacts, signing and checksums

Review folder: `C:\Users\nanda\OneDrive\Desktop\PROJECTS\Savings-and-Expense-Tracker-1.6.0-Review`.

- `Windows installer/Savings-and-Expense-Tracker-1.6.0-Setup.exe`: **unsigned** Windows x64 Inno installer, retained AppId `com.nandakumar.savingsandexpencetracker` and legacy profile path.
- `Android APK/Savings-and-Expense-Tracker-1.6.0.apk`: **release signed**, applicationId `com.nandakumar.savingsexpensetracker`, versionCode **10600**.
- Android certificate SHA-256: `f9d866f7564457ac7e03dad69bb3e97091e55b16940278f475bd23fe283faa9a`, matching the existing 1.5.1 APK. A phone still using the earlier lost-key identity cannot be updated by this APK; do not uninstall it to bypass the mismatch.
- `SHA256SUMS.txt` and `Reports/artifacts.json`: exact artifact hashes, sizes and signing classification. `Reports/build-metadata.json` and test evidence accompany them.
- `Source code/tools/tracker-source`: complete current shared and native source in a sparse Git checkout. `README-NATIVE.md` explains builds; source history retains the exact artifact commit.

## Approval, safe upgrade and rollback

1. Review these artifacts and remaining blocked checks. Actual provider sign-in, Android system-bar/deep-link behavior and install-over data preservation require authorized test accounts/devices. Do not approve broad deployment solely from mocked tests.
2. Export a fresh **full JSON backup** from each device, confirm pending changes have synced, and retain previous installers/APKs privately. Never reset the app, clear storage, uninstall or recreate cloud records during an upgrade.
3. After approval, close Windows normally, then use the installer with the existing identity/directory. Check the Android package and certificate against the installed APK before updating in place. A signature mismatch is a stop condition.
4. Verify records, ownership, receipt links, provisions/reconciliation and cloud revisions before editing. Update every client before resuming mixed-device edits. Production SQL guard deployment needs its own separate approval and rollback review.
5. If a problem appears, stop edits/sync, preserve the current full backup and diagnose. Do not upload an older backup over newer cloud data. An older client can drop new fields; Android downgrade restrictions also apply. Prefer a corrective same-identity release, or a separately reviewed restore from an appropriate backup, over uninstalling or forcing a downgrade.

No updater was introduced. No release was published, no remote branch pushed, and no installed application was replaced.

