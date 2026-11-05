# Savings & Expense Tracker 2.9.0 — Android More

- Replace Android's More popup with a purple-and-lavender full-height tools view above the existing bottom navigation.
- Add twelve grouped navigation cards, pastel Lucide icons, tool search, accessible Back control and compact Undo/Redo actions.
- Route reconciliation to Balance reconciliation; open existing provisions, financial position, account activity and monthly forecast sections directly.
- Support light/dark modes, existing palette settings, safe areas, reduced motion, narrow screens and large text.
- Preserve existing financial calculations, records, authentication, synchronization, package ID and production signing identity.

This is an Android-only binary release. Windows keeps its previous installer; Web and Windows retain their existing More interface. The optional `trackerReleasePlatforms` package field selects Android-only publishing through the existing release workflow; omit it or include both `android` and `windows` for a full release.

Device verification remains required for Android system Back/gesture navigation, keyboard/system insets and upgrading an existing installation with retained local data and a real synchronized session. Browser tests use synthetic records and do not verify a real device or production synchronization.
