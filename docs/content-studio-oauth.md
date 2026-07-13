# Content Studio — GitHub Login Setup

The Content Studio supports both:

1. **Continue with GitHub** through an OAuth App and the serverless functions in `functions/api/github/oauth/`.
2. **Fine-grained personal access token** as a fallback.

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

The login button automatically becomes active when `/api/github/oauth/config` confirms that the client ID and secret exist.

## Security model

- OAuth state validation protects the callback from cross-site request forgery.
- PKCE binds the authorization code to the browser login attempt.
- The client secret stays only in the serverless environment.
- The returned GitHub token is sent to the original Content Studio window with `postMessage` and held in session storage.
- The dashboard accepts only the `nandurpm` GitHub account and verifies write access to `nandurpm/portfolio`.
- The requested OAuth scope is limited to `public_repo read:user` because the portfolio repository is public.

## Static-only deployments

GitHub Pages and other static-only hosting do not execute the `functions/` directory. The token login continues to work, but direct GitHub OAuth login requires a serverless runtime such as Cloudflare Pages Functions, Netlify Functions, Vercel Functions, or an equivalent backend.
