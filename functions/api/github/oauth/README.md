# OAuth

## Purpose

Server-side portion of Content Studio's GitHub OAuth authorization-code flow.

## Contents

- `config.js` — Reports whether the required OAuth runtime configuration is available and returns only browser-safe values.
- `start.js` — Derives the configured callback URL, creates state and PKCE values, stores short-lived secure cookies, and redirects to GitHub authorization.
- `callback.js` — Validates the callback/cookies, exchanges the code using the deployment secret, verifies the GitHub identity, and returns the token to the originating studio window.

## Responsibilities

Only route-specific GitHub authentication and token-exchange logic belongs here. Editor state and publishing UI remain in `admin/`; generated-content publication remains in `scripts/` and `.github/workflows/`.

## Important Notes

Changes must preserve `/api/github/oauth/config`, `/start`, and `/callback`, plus the `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SITE_ORIGIN`, `GITHUB_OWNER`, and `GITHUB_REPOSITORY` environment contract. Never log or document runtime secret/token values. See `docs/content-studio-oauth.md` for deployment setup.
