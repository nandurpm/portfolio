# Tracker hardening without changing the live ledger

This change adds a 20-second deadline to each plan sync request on Web, Android, and Windows. It does not change how financial totals are calculated or how records, revisions, backups, sessions, or installer identities are stored. A deadline is not evidence that a write failed on the server. The client retains its local data and uses its existing revision and mutation ID checks on the next sync.

## Keep the change out of production while validating

- Keep this change on a review branch. Merges to `main` can trigger builds or releases. Do not stage `track/` output, push release tags, publish installers, or run the release workflow during this rehearsal.
- Run `npm run check`, `npm run test:browser`, and the disposable database and Supabase suites through Tracker quality. Never point a synthetic test at the live tracker project.
- With two synthetic accounts in staging, verify account isolation and sign-out, and check existing plan save, backup, restore, and conflict handling. Simulate an interrupted save and confirm there is one resulting change, including when its acknowledgement arrives late.
- Rehearse a Windows installer upgrade and an Android in-place update in disposable profiles, then sync a synthetic plan between Web, Android, and Windows. Verify the Android signer stays the same; verify Authenticode on both the Windows executable and installer before public distribution.
- Review production database metadata read-only when access is available: row policies and grants, the save function owner and execute permissions, the compatibility guard, and backup retention. Apply no SQL until a separate change has passed staging and has been approved.

## Before an approved rollout

1. On every active device, retain a verified full JSON export in protected storage. If there are pending edits, export that device's copy as well. Record the live version, source commit and current sync state without putting financial data in Git.
2. Confirm that the current cloud backup restores into a separate project. Retain the previous Web build and signed native installers. For any storage-format or API change, verify both client versions can read the unchanged format before allowing mixed-version writes.
3. Roll out the compatible build to a test device first. Check startup, local writes, sync, and backup restore with synthetic records before expanding. Do not uninstall or clear app data as an upgrade step.
4. If tracking or sync regresses, stop the rollout and retain both current local exports and cloud data. Restore the previous Web build or issue a corrective native build with the same identity. Never overwrite a newer ledger with an older backup without reconciling the changes first.
