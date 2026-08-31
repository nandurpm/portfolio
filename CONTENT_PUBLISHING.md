# Content publishing

## Purpose

This guide describes the supported ways to stage blog posts and project pages, plus the automated workflow that validates and publishes them.

## Browser editor

Open `https://nandakumarm.dpdns.org/admin/` after deployment.

The preferred sign-in is the server-backed GitHub OAuth flow documented in `docs/content-studio-oauth.md`. On a static-only deployment, configure the public OAuth Client ID for device-flow fallback, or use a fine-grained GitHub personal access token with these limits:

- Repository access: only `nandurpm/portfolio`
- Repository permission: Contents — Read and write

Any returned OAuth token or manually entered token is stored in `sessionStorage`, so it is cleared when the browser session ends. It is not committed to the repository.

The editor creates one Git commit containing the HTML file and cover image. The publishing workflow then validates and moves the files, updates the appropriate JSON index, and commits the generated website changes.

## Command-line blog staging

For repeatable local article creation, provide metadata/body/image inputs to `scripts/create-blog-post.mjs`. See `docs/BLOG_AUTOMATION.md` for the accepted fields, example command, edit behavior, and verification steps.

## Manual HTML upload

1. Copy the matching file from `templates/`.
2. Update all metadata and page content.
3. Upload the HTML and matching image to `uploads/blog/` or `uploads/projects/`.
4. Commit both files together.
5. Check the repository Actions page for the publishing result.

## Required blog metadata

- `post-title`
- `post-category`
- `post-date` in `YYYY-MM-DD`
- `post-excerpt`
- `post-image`

Optional: `post-slug`, `post-tags`, `post-read-time`.

## Required project metadata

- `project-title`
- `project-category`
- `project-description`
- `project-image`

Optional: `project-slug`, `project-date`, `project-technologies`, `project-demo`, `project-github`.

## Automated publication sequence

On a push to `main` that touches either upload inbox, `.github/workflows/publish-content.yml`:

1. Runs `scripts/publish-content.mjs` to validate metadata, publish page/image files, update JSON indexes, and remove processed staging files.
2. Runs `scripts/render-static-content.mjs` to rebuild project and article card blocks from those indexes.
3. Commits and pushes the generated public-site changes when a diff exists.

Supported cover-image extensions are `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, and `.svg`. For new content, the HTML slug and image basename must agree.

## Security

Never place an OAuth client secret, access token, private draft, or production environment value in an upload file. Removing a staged file during publication does not remove it from Git history.
