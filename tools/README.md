# Tools

## Purpose

Read-only developer checks for the committed static-site tree.

## Contents

- `audit_links.py` — Parses every repository HTML file, resolves local `href`/`src` paths, detects duplicate IDs, and reports missing titles or meta descriptions.

## Responsibilities

Keep deterministic, read-only maintenance checks here. Content-transforming automation belongs in `scripts/`; browser runtime logic belongs in `assets/js/`.

## Important Notes

Run `python3 tools/audit_links.py` from the repository root. Missing local references or duplicate IDs cause a non-zero exit; missing title/description metadata is currently reported but does not fail the command. External URLs, visual layout, JavaScript behavior, image quality, and PDF contents remain outside this audit's scope.
