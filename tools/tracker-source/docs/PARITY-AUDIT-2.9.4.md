# Financial parity audit — 7 November 2026

## Findings fixed

| Severity | Root cause | Fix and regression |
| --- | --- | --- |
| High: financial precision | Fixed epsilon multiplication could round decimal half-paise interest 10.075 to 10.07 while INR formatting displayed 10.08 | Shared decimal exponent paise rounder, half-away-from-zero policy aligned with Intl; loan regression principal2500/rate5/first EMI82 yields second interest10.08/principal89.92/balance2328.08 |
| Medium: bill scheduling | Accounts allowed a provision receipt linked to an off-cycle due month that Daily Entries rejected; it could be missed by planned bill allocation | Shared recurrence predicate, changed/new Accounts-link guard, next scheduled month default; valid advance payments remain supported |
| Medium: Android display | Local progress start/end state could remain outside a changed synchronized plan range | Clamp effective range values without discarding valid selections; browser regression changes the plan while Home remains mounted |
| Low: inconsistent information | Android's filtered progress showed future planned amounts while other progress views replaced them with “Future” | All show known planned income/expenses/savings; future recorded actuals remain blank |

## Data protection
No production records were read or written in this audit. Existing lender schedules are not regenerated automatically. New/changed money calculations use corrected rounding. Legacy off-cycle Accounts records remain readable; unrelated edits, backups and incoming sync are not rejected. User-created/financially edited links must follow their provision schedule. Refunds/reversals retain the original receipt link. Changes are shared across platforms; no schema/version migration is required.

## Evidence for published 2.9.3 baseline
Downloaded actual release APK and Windows installer; compared their SHA-256 to GitHub release asset digests. APK:6378736e299cd0f2c577be5f9030fab76079815d44cea4f752bcce4274441297. EXE:b82d109b594a960691b2cd66044cdb5652f77dd61c8b9b3066f3ef8d9f8f4be6.
Extracted APK assets and Windows Inno/ASAR without executing either application. Both embedded manifests and live Web build.json identify version2.9.3, clean source commit df8a2f0492a3fe313739a28ff1b9515c098b2ebe and source tree70d19968064e6d2fc87f28337fd4613eb4563f01. Native JavaScript/CSS files match after normalizing generated import filenames and embedded build timestamp/runtime-version metadata. This is payload evidence, not physical-device runtime evidence.

REA metadata analysis Evidence ev_e828966ed7f7632f65847ef9e9226903a9330dc940953cb633e92f40560e3a1d selected package.json and dist/build.json; its unselected JavaScript relationships remain unknown. The byte comparisons and archive hashes above are separate ordinary shell observations, not a claim of complete REA semantic analysis. No REA/client configuration was modified.

## Repeatable parity checks for 2.9.4
Build manifests contain financialLogicSha256 (all shared domain TypeScript sources) and dataModelSha256 (types, validation, cloud model). Release quality compares clean Web and native build fingerprints plus payload checksums via scripts/verify-financial-parity.mjs. The same check accepts extracted Windows dist and APK assets/public directories alongside the Web payload. Hash matching is source identity evidence; deterministic/browser tests establish selected behavior.

Browser parity scenario uses identical synthetic records on Web, Windows-shell simulation and Android: opening500, income100, expense10 and a25 internal transfer with2 fee. All return cash588, income100 and expenses12; snapshots also compare forecast, progress, planned totals, savings and net worth. This tests shell/presentation selection in Chromium, not Windows OS or Android hardware. Separate recurrence/form and stale-filter regressions cover the fixes.

## Correct interpretation of “exactly the same”
The calculation and shared data-model code is the same across official builds of the same version. Matching records, financial settings, selected month and report-through date yield matching financial outputs in the tested scenarios. Platform-specific layouts, auth gates, native file/update integrations and default view ranges intentionally differ. Report cutoff, live date/timezone or unsynced records can cause different screens to show different values without different arithmetic.

## Remaining verification and configuration gaps
A zero-bug guarantee is not possible. Physical Windows installer execution/upgrade, Android install/native system behavior and real-account authenticated offline/reconnection/conflict testing still require device/session access. Windows Authenticode signing is not configured. Prior release workflow reports missing TRACKER_BOT_CRON_SECRET for immediate Telegram triggering; scheduled checks are the fallback, and delivery is not claimed verified. Previous production scan reported leaked-password protection disabled; no supported Auth-setting mutation capability was available. No unrelated production security settings were changed in this audit.

Final counts, source commits and release results are recorded in the PR, CI and release page. Existing financial, transfer, installment, account isolation, import/export, theme and navigation regressions remain part of the checks.
