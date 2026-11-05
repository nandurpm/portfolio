# Savings & Expense Tracker 2.2.6

## Cross-platform audit follow-up
- Keep the restored Android 2.2.2 dashboard design from 2.2.5 and retain the 2.2.4 native update checks, background notifications and shared finance/synchronization model.
- Fix recent-activity navigation so Daily Entries and account-ledger movements lead to their respective complete histories instead of a misleading single View all link.
- Restore the shared recent-activity component's responsive styling for Web mobile and Android, including touch targets and readable account/amount labels.
- Correct the Accounts browser regression: an intermediate desktop layout may fit in the viewport and not require internal scrolling. Still verify that neither axis leaks scrolling into the outer document.
- Add dedicated browser tests for the restored Android and Web mobile activity navigation.

## Release integrity
- Build Web, Windows and the production-signed Android APK from this same versioned source via the existing unified GitHub Actions workflow.
- The Android release job downloads the most recent earlier published production APK and compares its signing certificate SHA-256 fingerprint with the new signed APK; fail the release if the signer changed.
- Preserve Android package ID and signing identity, Windows installation identity, Supabase account data, financial algorithms, loans, EMI receipts, reconciliation, and local data paths.
- Do not uninstall older apps. Back up and synchronize unsaved changes before installing an update in place.
- Real-device certificate comparison and in-place upgrade testing remain separate verification gates; publishing a signed artifact is not proof of a successful upgrade on an already-installed device.
