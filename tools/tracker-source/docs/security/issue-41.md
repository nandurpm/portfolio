# Issue 41: transitive dependency remediation

Verified 2 November 2026. Scope: the tracker dependency graph, without changing
financial calculations, database policies, account behavior or signing settings.

## Findings and scope

The baseline `npm audit --json` reported **31 moderate, zero high/critical**
findings. These are affected package entries propagated through the dependency
graph, not 31 independent advisories or evidence of financial data compromise.

| Installed path before remediation | Scope |
| --- | --- |
| ExcelJS → archiver → archiver-utils → glob 7/minimatch 3 | Production-installed Node archive/export dependencies |
| ExcelJS → archiver → readdir-glob → minimatch 5 | Production-installed Node archive discovery |
| ExcelJS → unzipper → fstream → rimraf 2 → glob 7 | Production-installed Node extraction/cleanup dependencies |
| Capacitor CLI → rimraf 6 → glob 13/minimatch 10 | Development/native build tooling |
| Electron builder → ASAR 3 / universal 2 / dir-compare | Development/native packaging tooling |
| ESLint, config-array and TypeScript ESLint → minimatch 10 | Development lint/type tooling |

Production-installed does not automatically mean reachable in the website: the
browser uses ExcelJS's prebuilt browser distribution, while filesystem glob
paths belong to Node exports/tooling. Both dependency scopes are remediated.

Advisories:

- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): glob cancellation bypass, affected modern glob versions through 14.0.1.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): minimatch globparts amplification, fixed starting at 11.0.1.

## Changes

Direct Electron, Capacitor, ExcelJS, ESLint and framework versions are unchanged.
Existing uuid/undici/fast-uri overrides remain. No audit suppression, forced npm
fix, checksum alteration or major framework downgrade is used.

- Pin vulnerable minimatch paths to upstream **11.0.4**.
- Use upstream **glob 14.0.3** in Capacitor/rimraf 6 and modern ASAR.
- Use upstream **ASAR 4.3.1** and **Electron universal 3.0.6** behind Electron
  builder to remove callers of the old callable minimatch API. These transitive
  packaging upgrades require Node ≥22.12; this repository already pins Node 24.
- Redirect only legacy archiver-utils and rimraf consumers through the private
  [glob callback adapter](../../compat/glob-callback/README.md). Its clearly
  identified workspace prerelease forwards to official glob 14.0.3 and minimatch
  11.0.4; it contains no legacy vulnerable matcher. The workspace and alias are
  included in the reproducible npm lockfile.
- Add `test:dependencies` to `npm run check`, and add an isolated native smoke CI
  job using Node 24, Java 21, Android SDK 36 and unsigned synthetic packages.

The compatibility checks caught and prevented a clean-audit-but-broken glob 7 /
minimatch 11 combination before the final adapter was selected.

## Validation

- Full and production-only npm audits: **zero vulnerabilities**.
- Frozen `npm ci --ignore-scripts` reproducibility checked with the final workspace lock.
- `npm run check`: lint, **99 unit tests**, strict TypeScript quality check, web
  build, bundle-size budget and build-manifest checksum verification pass.
- **24 Playwright tests** pass across authentication boundaries, login states,
  accessibility, responsive layouts and existing dashboard/loan screens.
- Archive/glob tests use the actual affected consumers: callback and sync APIs,
  `nonull`/brace expansion, exclusions, dotfiles, cancellation/error propagation,
  Jake/FileList, Electron builder file filters, ASAR unpack patterns, ZIP round
  trip and streaming Excel XLSX formula/Unicode round trip. Existing financial
  workbook round-trip tests also pass.
- **26 PostgreSQL checks** pass against an isolated PostgreSQL 17.11 database,
  including RLS, RPCs, conflict guards and real concurrent sessions.
- Disposable local **GoTrue 2.197.0 + PostgREST 14.18** checks pass: password login,
  two-user isolation, direct/anonymous-write denial, idempotency, conflicts,
  concurrent writers and logout. This used official Docker services because the
  CLI's hardcoded configuration directory was read-only in this environment.
  The original security assertions were not changed. No production project was contacted.
- Actual **Electron 44.9.3** runtime loads the generated ASAR.
- An **unsigned Windows x64 Electron directory package** builds; its packaged
  ASAR content is verified. This does not claim Windows execution or an NSIS
  installer/signing test.
- A disposable Capacitor Android project generates, synchronizes plugins and
  compiles a **debug APK** with SDK 36, Gradle 8.14.3 and Java 21.

All native fixtures are synthetic and removed after the checks. This repository
contains web source, not the installed application's full desktop/Android source
or release signing material. Production installation, device UI and release
signing remain the normal native release checks; their settings and credentials
were not modified. No residual npm vulnerabilities require risk acceptance.

## Re-run

```sh
npm ci --ignore-scripts
npm run check
npm audit
npm audit --omit=dev
npm ls glob minimatch --all
npm run test:browser
```

With a verified Electron installation and Android SDK/Java 21 available:

```sh
node node_modules/electron/install.js
TRACKER_ELECTRON_SMOKE=1 TRACKER_WINDOWS_PACKAGE=1 TRACKER_ANDROID_COMPILE=1 npm run test:dependencies
```

Database and local Supabase tests retain their existing disposable-only guards;
see the tracker README and `tracker-quality.yml`. Never use production accounts,
financial records or release signing keys for these checks.
