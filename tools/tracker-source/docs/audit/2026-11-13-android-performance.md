# Android startup and navigation performance

Baseline: `3f19b5772d315068a019403a67c9b0911be95ee7` (main after release 2.10.9).
Branch: `perf/tracker-android-20261113`.

## Confirmed bottleneck

`progress()` called `cumulative()` for every historical month just to obtain recorded cash. Each call rebuilt earlier monthly budgets. It also called the public actual-report calculation for each monthly and cumulative interval, repeatedly validating the same entry dates and constructing category maps. These synchronous calculations blocked rendering. The 288-month/1,000-entry synthetic case originally took approximately 2.5 seconds; timings varied with warm-up and load.

## Changes

- Extract the existing recorded-cash formula without changing its rounding or posting semantics. Progress no longer computes unused cumulative budgets.
- Validate/index in-range entries once per progress invocation and reuse the category map. Retain original transaction order and aggregate rounding, including legacy fractional-paise records. No object-identity financial cache is introduced, so mutable edits cannot return stale totals.
- Reuse the selected React screen element across unrelated menu/save-status renders, using stable navigation callbacks. Plan edits, entry inputs, navigation and the minute clock invalidate it. Midnight live-date rollover remains covered.
- Start independent App/CSS imports concurrently with native callback preparation. Rendering still awaits native bridge, OAuth callback initialization and stylesheet readiness. Storage validation, recovery and account gates remain in place.
- Preload common tab modules concurrently after startup; failed speculative requests remain retryable.
- Mount optional Android dashboard charts only near the viewport. Core balances/forms render immediately; all charts remain available on scroll, with an immediate fallback when IntersectionObserver is unavailable.
- Regenerate the shared bot finance bundle required by the repository's source-parity check. No bot/backend deployment is performed.

## Paired benchmark

Same server process and synthetic 1,000-entry fixtures, comparing the original baseline calculation against the optimized implementation. Every returned progress row was deeply equal.

| Plan months | Baseline ms | Optimized ms | Output parity |
|---|---:|---:|---|
| 12 | 95 | 16 | Exact |
| 120 | 1,350 | 39 | Exact |
| 288 | 3,102 | 65 | Exact |

`npm run benchmark:progress` provides a reproducible, network-free synthetic benchmark with a warm-up and three samples. A later local run reported median 7/27/46 ms for 12/120/288 months. These figures are server measurements, not phone startup or tab-switch timings, and they are not device guarantees.

## Regression coverage and verification

- `tests/progress-performance.test.ts`: nine cases covering independent ordered financial scans at before-plan, month/year, leap-day and after-plan cutoffs; transfers, fees, reversals, refunds, PF cash transfers, archived entries and legacy fractional paise. Checks exact outputs and no plan mutation, checks recomputation after an in-place edit, and applies a broad 1,500 ms server regression budget to a 288-month/1,000-entry plan.
- `tests/browser/android-long-plan-performance.spec.ts`: repeated long-plan tab switches with a broad 2,500 ms synthetic Chromium budget, deferred charts becoming available on scroll, unchanged plan records, and midnight/edited-income refresh. Timing evidence is attached to the CI browser artifact.
- Existing financial, persistence, auth, update, native and responsive suites remain required. Browser shell tests do not prove physical Android or installed Windows runtime performance.
- Local commands: `npm run check`, `npm run benchmark:progress`, `npm run typecheck:quality`, and `git diff --check`. The full local suite includes 279 tests after the nine new cases. See the PR checks/body for final clean-commit CI outcomes; pre-commit local build manifests name the baseline and modified working tree.

## Limits and release scope

No browser engine replacement, native permissions, application IDs, signing identity, financial rules, schema, synchronization behavior, user data or established palette/layout changes. Screen reuse avoids unrelated parent renders; it does not retain hidden pages or unsaved forms across navigation. Physical-device startup/tab measurements still require the user's phone. The PR does not publish an APK/EXE or bump the released version; installed 2.10.9 will receive these changes only through a subsequent approved release.
