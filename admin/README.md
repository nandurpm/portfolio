# Content Studio

## Purpose

Contains the browser-based portfolio administration workspace available at `/admin/`. The studio authenticates to GitHub, manages local drafts and media, and stages reviewed blog or project content for the repository publishing workflow.

## Contents

- `index.html` — Authentication and Content Studio application shell.
- `admin.js` — GitHub device-flow/token authentication, content editing, drafts, media, staging, and publishing interactions.
- `admin.css` — Dark/light themes and responsive studio layout, tables, forms, dialogs, editor, and status states.
- `config.js` — Public repository and optional OAuth client configuration; it must never contain a client secret.

## Responsibilities

Browser-side studio behavior and presentation belong here. Publication validation and generated-site updates belong in `scripts/` and `.github/workflows/`. Public portfolio pages should not depend on authenticated studio state.

## Important Notes

- GitHub Device Flow requires an OAuth App with Device Flow enabled. The public client ID may be configured; the client secret must never be committed.
- A fine-grained personal access token fallback should be limited to `nandurpm/portfolio` with only Contents read/write permission.
- Session credentials remain in browser session storage and are removed on sign-out or when the session closes.
- Drafts, editor preferences, and the optional client ID use local browser storage; published content is committed to GitHub.
