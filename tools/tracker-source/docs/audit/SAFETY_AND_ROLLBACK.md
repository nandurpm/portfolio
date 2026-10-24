# Audit correction safety checkpoint

- Audited and latest main SHA: `0d4fc2ed9a9281667c767114807ad5fadad19395`.
- Branch: `fix/tracker-audit-20261024`; isolated Git worktree; clean tracked baseline.
- Earlier workspace contains only an untracked reproducible `dist-web/`; it was not modified or reset.
- No production financial rows were read, exported, edited, reset or deleted. Database inspection is metadata/advisors only.
- This branch is for review. No merge, production build staging or deployment is authorized.

## Backup and release gate

Before any later approved deployment, export and verify a full JSON backup on each active device, retain the previous web assets and native installers, and record the current cloud revision. Do not put financial backups or credentials in Git. Mixed older clients must be upgraded before using the new optional records: they may otherwise strip fields they do not recognize. A server-side compatibility guard requires separate database approval.

## Rollback

Before merge: leave main/live unchanged and abandon this isolated branch if rejected. After an approved release: restore the previous web assets/source commit in a new revert commit; do not reset the main branch. Stop older clients from syncing if they cannot preserve newer optional fields. Export current data first. Optional reconciliation/provision records can stay preserved in a JSON backup; no transaction or due date needs conversion. Restore an independently verified full backup only after review of later transactions and sync revision, never automatically over a newer cloud plan. No database rollback is needed for this branch because no database migration is applied.

Invalid receipt links are rejected with an actionable error, rather than silently dropping transactions. The original file remains recoverable; repair must be reviewed separately. Valid legacy records remain supported.
