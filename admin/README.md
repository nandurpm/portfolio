# Content Studio

The portfolio Content Studio is available at `/admin/`.

## Authentication

### GitHub direct sign-in

1. In GitHub, create an OAuth App.
2. Use the portfolio URL as the homepage URL.
3. Enable **Device Flow** in the OAuth App settings.
4. Copy the OAuth App **Client ID**.
5. Paste the Client ID into Content Studio → Settings → GitHub connection.

The Client ID is public and may be stored in `admin/config.js`. Never add the OAuth client secret to this repository.

The device flow requests the `public_repo` scope because this portfolio repository is public and the studio must commit content.

### Fine-grained token fallback

Create a fine-grained personal access token limited to `nandurpm/portfolio` with **Contents: Read and write**. The studio stores the credential only in browser session storage and removes it when you sign out or close the session.

## Publishing workflow

The editor commits generated HTML and its cover image to the appropriate `uploads/` folder. The existing GitHub Actions publisher validates the files, publishes them to `blog/` or `works/`, and updates the JSON content index.

## Local data

Drafts, editor preferences, and the optional OAuth Client ID are stored only in local browser storage. Published content remains in GitHub.
