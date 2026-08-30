# API

## Purpose

Top-level HTTP API namespace for deployed Pages Functions.

## Contents

- `github/` — GitHub-provider routes used by the Content Studio authentication flow.

## Responsibilities

Add server-side handlers under the directory matching their public URL. Keep handlers narrow, validate request inputs, and return browser-safe responses.

## Important Notes

Keep browser-only UI logic in `admin/` or `assets/js/`, not here. The current route tree begins at `/api/github/`; changing it requires synchronized changes in the Content Studio and OAuth App callback configuration.
