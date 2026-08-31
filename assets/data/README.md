# Data

## Purpose

Machine-readable content indexes consumed by the public renderers, static generators, and Content Studio.

## Contents

- `works.json` — Project title, slug, category, description, image, URL, technologies, and optional date/demo/source links.
- `blog.json` — Article title, slug, category, date, read time, excerpt, image, tags, and URL.
- `media.json` — Content Studio media-library records; it is currently an empty array until images are uploaded through the studio.

## Responsibilities

Store public metadata and asset references here. Rendering logic belongs in `assets/js/`, publication transformations in `scripts/`, and long-form HTML in `blog/` or `works/`.

## Important Notes

Each file must remain a JSON array because the browser loaders and Node.js scripts validate that shape. Keep field names, slug/URL relationships, sort expectations, and referenced asset paths compatible with `main.js`, `blog.js`, `publish-content.mjs`, and `render-static-content.mjs`. JSON does not support comments; document schema decisions here instead.
