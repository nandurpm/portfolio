# GitHub Actions workflows

The repository maintains five active, purpose-specific workflows:

| Workflow | Purpose | Trigger |
| --- | --- | --- |
| `build-tracker.yml` | Build and commit the authenticated web application into `track/` | Changes to Tracker source on `main`, manual dispatch |
| `tracker-quality.yml` | Run Tracker tests, synthetic browser, database, Supabase and native dependency checks | Tracker pull requests and audit branches |
| `tracker-unified-release.yml` | Build and publish signed Android APK, Windows installer and source archive | Manual dispatch or `tracker-v*` tag |
| `publish-content.yml` | Publish staged website blog and project content | Upload changes on `main`, manual dispatch |
| `sync-public-projects.yml` | Refresh portfolio project metadata and static pages | Weekly Monday schedule, manual dispatch |

## Operational protections

- Do not delete `tracker-unified-release.yml`: its signing secrets and Android/Windows release jobs are required for in-place updates.
- Do not delete `build-tracker.yml`: GitHub Pages serves the generated `track/` route, not raw source.
- `tracker-quality.yml` uses disposable test records; it is separate from production release publication.
- `build-tracker.yml`, `publish-content.yml` and `sync-public-projects.yml` serialize writes to `main` with `portfolio-main-writer`.
- The built-in **pages build and deployment** workflow is managed by GitHub Pages, not by a file in this directory.

## Cleanup (2026-11-05)

Removed obsolete `site-audit.yml`: it ran automatically only on four deleted feature branches, and the website's normal publishing and Tracker verification workflows remain intact. Historical GitHub Actions run entries may still be visible in GitHub's interface even after their workflow files are removed.
