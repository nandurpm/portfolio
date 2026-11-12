# GitHub Actions workflows

The repository uses purpose-specific workflows for site publishing, Tracker validation, scheduled audits, and application releases.

| Workflow | Purpose | Trigger |
| --- | --- | --- |
| `build-tracker.yml` | Build and stage the sign-in-required Tracker web application into `track/` | Changes to Tracker source on `main`; manual dispatch |
| `tracker-quality.yml` | Run Tracker lint, unit, browser/accessibility, database, local Supabase, and native checks without deployment | Tracker pull requests; audit-fix branches; manual dispatch |
| `weekly-tracker-audit.yml` | Run the Gemini financial/technical audit, publish its report, run independent quality checks even when no fix is proposed, create a reviewable PR after validated fixes, and send an audit-result Telegram notification | Weekly Sunday 02:00 IST; manual dispatch on `main` |
| `weekly-tracker-audit-smoke.yml` | Verify Gemini can repair a disposable integer-paise defect; apply the patch on a clean runner and execute regression tests. Does not touch application source, publish, or deploy | Dedicated `automation/audit-pipeline-*` branches when the smoke workflow file changes; manual dispatch |
| `tracker-unified-release.yml` | Build and publish the configured Android APK and, when enabled by `trackerReleasePlatforms`, Windows installer; verify release assets and notify the update bot | Tracker source changes on `main`; manual dispatch; `tracker-v*` tags |
| `publish-content.yml` | Publish staged website blog and project content | Content changes on `main`; manual dispatch |
| `sync-public-projects.yml` | Refresh portfolio project metadata and static pages | Weekly Monday schedule; manual dispatch |

## Operational protections

- Do not delete `tracker-unified-release.yml`: its signing secrets and Android/Windows release jobs are required for in-place updates.
- Do not delete `build-tracker.yml`: GitHub Pages serves the generated `track/` route, not raw source.
- `tracker-quality.yml` uses disposable test records and is separate from production release publication.
- `weekly-tracker-audit.yml` gives Gemini only file-edit tools while the API key is present. Keyless jobs apply proposed changes to a clean checkout and run the existing quality workflow before creating a non-auto-merged pull request.
- When Gemini proposes no source changes, the weekly audit still dispatches the full quality workflow against the audited `main` commit. A green audit-agent job alone is not treated as a successful application verification.
- Audit report statuses distinguish static inspection from executable verification. A code review cannot be labelled PASS without an executed test or build.
- `weekly-tracker-audit-smoke.yml` uses only an isolated synthetic fixture. It has read-only repository permissions and no release, deployment, PR, or production-data steps.
- Audit Telegram notifications report the model path, audit result, validation result, full-quality result, and report/run link. App-release notifications are a separate path owned by `tracker-unified-release.yml` and the Savings Tracker Telegram bot.
- The unified release workflow checks the matching `tracker-vX.Y.Z` tag before building from a main-branch push. The `trackerReleasePlatforms` package setting controls which native packages are built.
- The release workflow invokes the Savings Tracker bot with `kind: updates` after public assets are verified when `TRACKER_BOT_CRON_SECRET` is configured. The bot's scheduled release checks remain the fallback notification mechanism.
- `build-tracker.yml`, `publish-content.yml`, and `sync-public-projects.yml` serialize writes to `main` with `portfolio-main-writer`.
- The built-in **pages build and deployment** workflow is managed by GitHub Pages, not by a file in this directory.

## Historical cleanup

The obsolete `site-audit.yml` workflow was removed on 2026-11-05. Historical GitHub Actions run entries may remain visible after a workflow file is removed.
