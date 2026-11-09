# Savings & Expense Tracker 2.10.4

- Guard Windows update prompts against GitHub release assets that are not yet uploaded or have invalid/empty sizes. Continue selecting the most recent usable release if a newer release is incomplete.
- Restrict trusted APK/EXE download URLs so the release tag, filename version, and platform-specific extension match exactly.
- Add regression tests for incomplete Windows releases, fallback to older valid releases, and mismatched download URLs.
- No changes to financial calculations, cloud synchronization, theme settings, Android package identity, signing, database schemas, or production financial records.
