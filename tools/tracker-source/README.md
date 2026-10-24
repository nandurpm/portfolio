# Tracker web source

Shared tracker UI with mandatory website sign-in, existing Supabase account sync and an empty public seed. No personal budget, backup, session or Android signing files are included. Build with Node 24: npm ci --ignore-scripts && npm run build:web. The portfolio Wrangler custom build stages dist-web at /track/.

### Audit correction branch verification

Use Node **24.19.0** (`nvm use`; also pinned in `.node-version`). Node 22 is outside this project's supported engine range; do not use `--force` or disable engine checks.

```sh
npm ci --ignore-scripts
npm run check
npm run audit
npx playwright install chromium
npm run test:browser
```

`npm run build` aliases the authenticated web production build; `npm test` runs all domain/import tests. Browser tests run a development-only synthetic fixture, block Supabase requests, and exercise five viewports. They do **not** verify real authentication. Never deploy `tests/browser/harness.html` or the Vite development server.

`npm run test:security` is blocked by default. Configure `TRACKER_TEST_URL`, `TRACKER_TEST_KEY` (publishable/anon only), `TRACKER_TEST_EMAIL_A`, `TRACKER_TEST_PASSWORD_A`, `TRACKER_TEST_EMAIL_B`, `TRACKER_TEST_PASSWORD_B` for two empty authorized accounts in a disposable project with the reviewed schema/policies. Set `TRACKER_DISPOSABLE_TEST_PROJECT=I_AUTHORIZE_SYNTHETIC_TEST_RECORDS` to opt in. It refuses the production project and accounts with existing plans, creates synthetic plans, and retains them for review. Never put credentials in Git. OAuth, password recovery, refresh/expiry and interactive browser authentication need separate manual verification.

Full plan range means the current plan settings; Original imported range is separate. Forecast range changes are display-only. XLSX exports now retain full-plan metadata even when visible rows use a selected range; JSON backups remain the recommended complete history backup. Invalid embedded metadata is rejected instead of silently dropping linked records.

EMI payments are cash transactions on their actual payment dates; liability due dates and planned payment dates remain separate. Before-plan receipts count toward lifetime loan repayment, while plan cash starts at the supplied opening balance (which must already reflect those payments). After-plan receipts stay archived until the plan is extended. Neither case automatically changes the opening balance.

Balances & Provisions adds opt-in statement comparisons and bill reserves. Reconciliation never inserts an adjustment transaction. Payment-method filters must match entries; internal account transfers and multi-account ledgers are not modeled. For a provision, monthly allocation earmarks funds without an extra expense; the bill amount replaces the category's flat monthly forecast in scheduled due months. Actual payments remain one cash expense. Link early bill payments to their liability due month to move forecast cash into the payment month. Explicit monthly overrides still take precedence.

**Release gate:** do not enable new provision/comparison records across older clients until all clients are updated and the server compatibility guard has been reviewed/applied with approval. The client detects omitted optional fields, but cannot stop an older client overwriting cloud JSON on its own. See `docs/audit/SAFETY_AND_ROLLBACK.md` and `TRACKER_IMPLEMENTATION_REPORT.md` for verification limits and rollback.

### Remaining verification work and release identity

`npm run test:database` requires an explicitly disposable **loopback** PostgreSQL database named `tracker_test` and `TRACKER_DISPOSABLE_DATABASE=I_AUTHORIZE_SYNTHETIC_TEST_RECORDS`. It refuses an existing tracker table. CI uses PostgreSQL 17 with two synthetic subjects to test copied RLS policies, the actual RPC definition, simultaneous sessions, and the proposed integrity/compatibility trigger. No production row is exported. The SQL fixture emulates only the `auth.uid()` boundary; it does not verify Supabase JWT signing or OAuth.

A separate CI job starts an isolated local Supabase CLI stack (2.122.0), creates two synthetic Auth users, and runs real password/token-refresh/logout plus REST/RPC tests. The helper is restricted to the CLI's loopback API/DB ports; no cloud project is linked. `test:security` still refuses the production project and needs explicit opt-in. Browser auth tests use mocked HTTP responses and are labeled accordingly; they test the real WebAccess gate without proving real provider configuration.

Web builds emit `build.json` with source commit/tree, build timestamp, package/Node version, lockfile hash and SHA-256 asset inventory. Settings shows the short commit and timestamp. CI checks the manifest/assets and retains `tracker-web-build`; staging copies the verified identity into `release.json`. To check a later approved deployment against the trusted CI artifact:

```sh
npm run verify:deployment -- https://nandakumarm.dpdns.org/track/ APPROVED_40_CHARACTER_SOURCE_COMMIT /absolute/path/to/approved/build.json
```

The trusted manifest must come from the approved CI artifact or versioned generated release, not from the live site being tested. This detects mixed/stale assets and identity mismatch; it is not a signed software attestation. `SOURCE_DATE_EPOCH` can fix the timestamp for reproducible rebuilds.

Axe/keyboard and cold Loan-route smoke tests use synthetic data at 320, 390, 768 and 1366 CSS pixels. Their artifacts contain no real accounts. Automated WCAG checks do not replace a screen-reader/manual accessibility assessment. Installed Windows/Android storage/backup validation requires the actual native source and builds, absent from this web-source repository. Google OAuth must still be tested with an authorized provider/test account. Proposed SQL is not a production migration and requires separate approval.
