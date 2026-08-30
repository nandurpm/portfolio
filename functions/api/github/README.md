# GitHub API Routes

## Purpose

Provider-specific API namespace for server-side GitHub integrations used by the portfolio.

## Contents

- `oauth/` — OAuth configuration, authorization redirect, callback validation, code exchange, and popup response endpoints.

## Responsibilities

Place only GitHub-provider request handlers and their route-local helpers here. General browser state stays in `admin/`, while content publication logic stays in `scripts/` and GitHub Actions.

## Important Notes

Do not commit OAuth secrets or access tokens. Provider endpoints must preserve the configured popup target origin, state/PKCE validation, secure cookie behavior, and the configured repository/account boundary.
