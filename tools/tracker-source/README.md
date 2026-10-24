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
