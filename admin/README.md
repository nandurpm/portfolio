# Content Studio

## Purpose

This directory contains the browser-based private workspace available at `/admin/`. It authenticates the portfolio owner, reads the published content indexes, manages local drafts, previews generated pages, and commits staged blog/project upload pairs to GitHub.

## Contents

- `index.html` — Application shell for authentication, dashboards, libraries, editor views, and dialogs.
- `admin.css` — Complete dark/light responsive design system for the studio.
- `admin.js` — GitHub API client, authentication flows, local state, content editor, page generator, publishing controls, and workflow monitoring.
- `config.js` — Deployment-safe public defaults for repository coordinates, the site URL, and an optional OAuth client ID.

## Authentication

### Server-backed GitHub sign-in

1. In GitHub, create an OAuth App.
2. Use the portfolio URL as the homepage URL and `/api/github/oauth/callback` as the callback URL.
3. Store the Client ID and Client Secret in the deployment environment as described in `docs/content-studio-oauth.md`.
4. Deploy the Pages Functions under `functions/api/github/oauth/`.

The studio checks `/api/github/oauth/config` and opens the server-backed popup flow when the runtime variables are available. The client secret remains in the serverless environment and must never be added to this directory.

### Device-flow fallback

When server-backed OAuth is unavailable, the studio can use an OAuth App with **Device Flow** enabled. Add only its public Client ID in Content Studio settings or `admin/config.js`; the browser requests the `public_repo` scope and polls GitHub until the owner approves the displayed verification code.

Never place an OAuth client secret in browser configuration. Device flow is a fallback for static-only deployments and does not use the Pages Functions callback.

### Fine-grained token fallback

Create a fine-grained personal access token limited to `nandurpm/portfolio` with **Contents: Read and write**. The studio stores the credential only in browser session storage and removes it when you sign out or close the session.

## Publishing workflow

The editor commits generated HTML and its cover image to the appropriate `uploads/` folder. The existing GitHub Actions publisher validates the files, publishes them to `blog/` or `works/`, and updates the JSON content index.

## Local data

Drafts, editor preferences, and the optional OAuth Client ID are stored only in local browser storage. Published content remains in GitHub.

The GitHub credential is held in `sessionStorage`, not `localStorage`; signing out or ending the browser session removes it. Local draft content and non-secret editor preferences persist in `localStorage`.

Removing a credential from browser storage does not revoke it at GitHub. Revoke an OAuth authorization or fine-grained token in GitHub account settings if it may have been exposed.

## Local Demo

Serve the repository over HTTP and open `/admin/?demo=1` on `localhost` or `127.0.0.1`. Demo mode uses built-in sample records and disables GitHub requests, which makes it suitable for UI review without repository writes.

## Responsibilities

Studio-only interface and browser integration code belongs here. Published content belongs in `blog/`, `works/`, and `assets/data/`; server-side OAuth exchange logic belongs in `functions/api/github/oauth/`; repeatable repository transformations belong in `scripts/`.

## Important Notes

- Preserve the `CONFIG` owner, repository, branch, and site URL contract when changing deployment targets.
- Generated pages must retain the metadata names consumed by `scripts/publish-content.mjs`.
- `sanitizeContent()` removes unsafe editor markup before preview or commit. The publisher validates metadata and file pairing, so only owner-reviewed HTML should enter an upload inbox.
- Never place an OAuth client secret or access token in `config.js`, HTML, or committed JavaScript.
