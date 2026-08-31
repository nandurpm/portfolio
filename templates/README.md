# Templates

## Purpose

Manual HTML starting points that produce metadata compatible with the automated publisher.

## Contents

- `blog-upload-template.html` — Blog metadata fields, cover-image convention, article structure, and shared assets.
- `project-upload-template.html` — Project metadata fields, optional demo/source links, cover-image convention, and project structure.

## Responsibilities

Copy the matching template into `uploads/blog/` or `uploads/projects/`, rename it to the final slug, update the copied file's purpose heading, and replace every placeholder in its metadata, title, image path/alt text, date, category, and body. Upload the matching image in the same commit.

## Important Notes

Placeholder image references are intentionally ignored by `tools/audit_links.py` only while the file remains under `templates/`. Once copied to an upload inbox, the publisher requires real metadata and an existing matching image. Keep field names compatible with `scripts/publish-content.mjs`.
