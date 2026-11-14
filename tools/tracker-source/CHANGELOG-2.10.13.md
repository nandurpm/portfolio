# Savings and Expense Tracker 2.10.13

Richer Android styling for the four-area interface introduced in 2.10.12, with a matching Windows version for consistent update detection.

## Android visual refresh

- Deep navy/indigo balance-card gradient, stronger amount typography and a clearly labelled reporting-date inset.
- Mint income, coral expense/deficit and lavender savings cards with aligned rounded icon badges.
- Refined green Add button, selected-tab indicators, account cards and transaction-type badges.
- Coordinated quick actions, More tools and bottom-sheet fields in light and dark themes.
- Static styling without new image downloads, dependencies, blur effects or continuous animations. Device rendering performance has not been benchmarked.
- Android recent-activity buttons use their visible record text as accessible names.

## Preservation and updates

The four-area navigation and all existing features remain available. Financial calculations, data models, authentication, storage, synchronization and backup formats are unchanged. Existing Android application ID and signing identity are preserved. Windows keeps its established interface and Settings → About → Check for updates option.

No OTA updater or production data migration is included. Bot release notifications remain an explicit manual opt-in.

## Verification

The merged theme passed 290 unit tests, all 88 browser tests, Android compilation/native test tasks, Windows installer packaging and disposable backend checks. Light/dark screenshots were visually reviewed. Release-specific quality, financial-engine parity, APK identity/signing continuity, isolated Android emulator in-place upgrade and native/widget checks run before publication.

Browser/emulator checks do not certify physical-device keyboard/TalkBack behavior, device rendering performance or installed Windows runtime behavior; those remain unverified.

## Installation

Export a full JSON backup and synchronize pending changes, then install over the existing application. Android: More → Settings → About → Check for updates, or download the APK here. Windows: Settings → About → Check for updates, or run this release's Windows installer over the existing installation.
