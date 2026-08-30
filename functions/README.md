# Functions

## Purpose

Cloudflare Pages Functions that provide the small server-side surface required by the otherwise static portfolio.

## Contents

- `api/` — URL-mapped API namespace.
- `api/github/oauth/` — GitHub OAuth configuration, authorization-start, and callback/token-exchange handlers used by Content Studio.

## Responsibilities

Keep deployable request handlers and narrowly scoped server integrations here. Public UI logic belongs in `admin/` or `assets/js/`; repository automation belongs in `scripts/`; secrets belong only in the deployment environment.

## Important Notes

Cloudflare maps this directory structure to request paths. Preserve filenames and route nesting unless the browser endpoints change at the same time. These files are excluded from the static asset bundle by `.assetsignore` and are executed by the Pages Functions runtime.
