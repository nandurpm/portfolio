# GitHub Actions workflows

The repository maintains six active, purpose-specific workflows:

| Workflow | Purpose | Trigger |
| --- | --- | --- |
| `build-tracker.yml` | Build and commit the authenticated web application into `track/` | Changes to Tracker source on `main`, manual dispatch |
| `tracker-quality.yml` | Run Tracker tests, synthetic browser, database, Supabase and native dependency checks | Tracker pull requests, audit branches, manual dispatch |
| `weekly-tracker-audit.yml` | Run Gemini financial/technical audit, validate proposed fixes with the full quality suite, then open a reviewable PR | Weekly Sunday 02:00 IST, manual dispatch |
| `tracker-unified-release.yml` | Build and publish signed Android APK, Windows installer and source archive | Automatic when `main` receives a new Tracker version, manual dispatch, or `tracker-v*` tag |
| `publish-content.yml` | Publish staged website blog and project content | Upload changes on `main`, manual dispatch |
| `sync-public-projects.yml` | Refresh portfolio project metadata and static pages | Weekly Monday schedule, manual dispatch |

## Operational protections

- Do not delete `tracker-unified-release.yml`: its signing secrets and Android/Windows release jobs are required for in-place updates.
- Do not delete `build-tracker.yml`: GitHub Pages serves the generated `track/` route, not raw source.
- `tracker-quality.yml` uses disposable test records; it is separate from production release publication.
- `weekly-tracker-audit.yml` uses the `GEMINI_API_KEY` Actions secret only in its read-only audit job. The full quality workflow runs separately on an isolated branch before a pull request is opened. It never deploys, publishes a release, or changes production financial records.
- `build-tracker.yml`, `publish-content.yml` and `sync-public-projects.yml` serialize writes to `main` with `portfolio-main-writer`.
- The built-in **pages build and deployment** workflow is managed by GitHub Pages, not by a file in this directory.

## Cleanup (2026-11-05)

Removed obsolete `site-audit.yml`: it ran automatically only on four deleted feature branches, and the website's normal publishing and Tracker verification workflows remain intact. Historical GitHub Actions run entries may still be visible in GitHub's interface even after their workflow files are removed.

The unified release workflow checks whether the matching `tracker-vX.Y.Z` release already exists before automatically rebuilding on a branch push. This avoids duplicate releases when the workflow file changes. Telegram software alerts are independently checked by Supabase Cron every five minutes even without a GitHub Actions bot secret.
