# Content publishing

## Browser editor

Open `https://nandakumarm.dpdns.org/admin/` after deployment.

Use a fine-grained GitHub personal access token with these limits:

- Repository access: only `nandurpm/portfolio`
- Repository permission: Contents — Read and write

The token is stored in `sessionStorage`, so it is cleared when the browser tab session ends. It is not committed to the repository.

The editor creates one Git commit containing the HTML file and cover image. The publishing workflow then validates and moves the files, updates the appropriate JSON index, and commits the generated website changes.

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
