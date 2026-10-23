# Content Studio — GitHub Login Setup

The repository contains Pages Function handlers for OAuth, but the current `wrangler.jsonc` serves Workers static assets. Workers Assets does not execute the `functions/` directory. Keep `serverOAuth: false` in `admin/config.js` on that deployment.

The Content Studio supports:

1. **Continue with GitHub** through an OAuth App and the serverless functions in `functions/api/github/oauth/` when deployed on Cloudflare Pages Functions.
2. **Fine-grained personal access token** as the primary path on the current Workers static-assets deployment.

The OAuth client secret must never be stored in HTML, JavaScript, GitHub commits, or repository variables visible to the browser.

## Create the GitHub OAuth App

Open GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** and use:

- **Application name:** `Nandakumar Content Studio`
- **Homepage URL:** `https://nandakumarm.dpdns.org`
- **Authorization callback URL:** `https://nandakumarm.dpdns.org/api/github/oauth/callback`

Copy the Client ID and generate a Client Secret.

## Configure the deployment environment

Add these encrypted environment variables to the hosting deployment:

```text
GITHUB_CLIENT_ID=<OAuth App client ID>
GITHUB_CLIENT_SECRET=<OAuth App client secret>
SITE_ORIGIN=https://nandakumarm.dpdns.org
GITHUB_OWNER=nandurpm
GITHUB_REPOSITORY=portfolio
```

For Cloudflare Pages, add them under **Settings → Environment variables** for Production, then redeploy the latest commit.

On a Pages Functions deployment, set `serverOAuth: true` in `admin/config.js`. The login button checks whether `/api/github/oauth/config` confirms that the client ID and secret exist.

## Security model

- OAuth state validation protects the callback from cross-site request forgery.
- PKCE binds the authorization code to the browser login attempt.
- The client secret stays only in the serverless environment.
- The returned GitHub token is sent to the original Content Studio window with `postMessage` and held only in memory for the current tab. Reloading or closing the tab requires signing in again.
- The dashboard accepts only the `nandurpm` GitHub account and verifies write access to `nandurpm/portfolio`.
- The device-flow fallback requests only `public_repo`, which is required to write the public portfolio repository; the app separately calls `/user` to validate the account. The server-backed callback uses `public_repo read:user` for its server-side identity check.

## Static-only deployments

The current `wrangler.jsonc` deploys Workers static assets, which do not execute the `functions/` directory. The admin UI therefore presents the fine-grained token path as primary on this deployment. Direct GitHub OAuth login requires a serverless runtime such as Cloudflare Pages Functions, Netlify Functions, Vercel Functions, or an equivalent backend; alternatively, configure a public OAuth App Client ID for the device-flow fallback.

## Protect the deployed editor

The frontend is a public asset; publishing still requires the repository owner and GitHub write access. Deploy `_headers` with the editor to enforce its script CSP, prevent framing, and disable caching. Content is sanitized by the vendored DOMPurify allowlist before preview and publication. Keep that vendor version current.

For an additional access boundary, configure Cloudflare Access for `/admin` and `/admin/*` in the hosting account. This repository cannot configure account-level Access policies. Do not use `robots.txt` as access control. OAuth callbacks are backend routes and require a deliberately compatible Access policy.
