# Content upload inbox

Upload complete HTML files and their matching cover images into one of these folders:

- `uploads/blog/`
- `uploads/projects/`

The HTML filename and image should use the same slug, for example:

- `uploads/blog/my-article.html`
- `uploads/blog/my-article.jpg`

The GitHub Action validates the metadata, copies the page and image into the public website, updates the JSON index, and removes the processed upload files.

Templates are available in the `templates/` folder. The browser editor is available at `/admin/` after deployment.
