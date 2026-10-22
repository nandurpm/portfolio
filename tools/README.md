# Tools

## Purpose

Read-only developer checks for the committed static-site tree.

## Contents

- `audit_links.py` — Parses published HTML and upload templates (excluding Vite source, caches and dependencies), resolves local `href`/`src` paths, detects duplicate IDs, and reports missing titles or meta descriptions.

- `test-portfolio.cjs` — Chromium regressions using the tracker’s pinned Playwright dependency. Applies `_headers` locally to test CSP and caching; it does not emulate Cloudflare routing.

## Responsibilities

Keep deterministic, read-only maintenance checks here. Content-transforming automation belongs in `scripts/`; browser runtime logic belongs in `assets/js/`.

## Important Notes

Run `python3 tools/audit_links.py` from the repository root. Missing local references or duplicate IDs cause a non-zero exit; missing title/description metadata is currently reported but does not fail the command. External URLs, visual layout, JavaScript behavior, image quality, and PDF contents remain outside this audit's scope.
