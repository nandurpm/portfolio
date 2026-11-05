# Savings & Expense Tracker 2.9.3 — Navigation and Performance Audit

- Mount the selected screen immediately instead of waiting for the outgoing screen's exit animation.
- Share lazy-import promises with navigation-intent preloading; retry failed speculative requests. Warm only Transactions, Accounts and Budget sequentially after the initial screen settles.
- Avoid calculating historical cash for future progress rows that never display it, and reuse a ledger-period result within cumulative cash calculation.
- Preserve the approved Android More design, compact reporting controls, 6px page gutters and widened activity cards.
- Preserve latest upstream keyboard shortcuts and help panel.
- Add import deduplication/retry, extended-horizon financial equivalence and animated navigation regressions.
- Rebuild the generated Telegram finance bundle from the shared calculation source.
- Release Web, Windows and Android from the same shared version and data model.

No financial records, schema, authentication or synchronization protocols were changed. Physical Windows/Android installation, native keyboard/system-bar behaviour and real-account production sync still require device verification. Production leaked-password protection is disabled, and immediate Telegram release triggering lacks its configured GitHub credential; neither is claimed fixed by this source release.
