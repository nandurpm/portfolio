# Uploads

## Purpose

Git-tracked inboxes for complete content pairs awaiting validation and automated publication.

## Contents

- `blog/` — Staged article HTML and its matching cover image.
- `projects/` — Staged project HTML and its matching project image.
- `.gitkeep` files — Retain otherwise empty inbox directories between publications.

## Responsibilities

Only complete HTML/image upload pairs and the documented inbox markers belong here. The publisher copies approved output into `blog/` or `works/`, moves cover images into the matching asset directory, updates JSON indexes, and removes processed staging files.

## Important Notes

`.github/workflows/publish-content.yml` watches both inboxes on `main`. HTML metadata, slug, and image basename must agree; supported image extensions are `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, and `.svg`. Never stage secrets, private drafts, or unpublished personal files because every committed upload enters repository history even after the working-tree copy is removed.
