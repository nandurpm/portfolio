# Savings and Expense Tracker 2.10.11

A native Android and Windows release adding a clearer account-to-account transfer workflow.

## New: account-to-account transfers

- Added a dedicated **Transfer** action beside **Transaction** in Accounts & transactions.
- The action opens the existing validated transfer form with the transfer type preselected.
- Select the source account, destination account, date, amount, optional fee and description in one place.
- The action remains disabled until at least two accounts exist.
- Transfers continue to affect account balances without being counted as income or expenses or artificially changing net worth.
- Added integration coverage for normal transfers, transfer fees, invalid account selections, and reversal across a year boundary.

## Compatibility and safety

- Existing account data, transaction history, backup formats, Android application ID and Android signing identity are preserved.
- No production user data migration is required.
- Export a full JSON backup and synchronize pending changes before upgrading. Do not uninstall the existing Android or Windows application.

## Verification

- Full non-browser test suite: 290 tests passed across 49 files.
- Lint and TypeScript quality checks passed on the release branch.
- Web production build completed successfully.
- Release workflow additionally verifies the signed APK, existing Android signing certificate, Windows installer, native upgrade behavior, and isolated Android emulator checks before publication.

## Installation and updates

- Android: open Settings and use the in-app update check, or download the verified APK from the official GitHub Release.
- Windows: open Settings → About → Check for updates, or download the official Windows installer and run it over the existing installation.
