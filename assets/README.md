# Assets

## Purpose

Shared static resources consumed by the public portfolio, generated content, and Content Studio previews.

## Contents

- `css/` — Core styles, content layouts, accessibility polish, reveal states, and event-specific presentation.
- `js/` — Theme, navigation, rendering, filtering, presentation-deck, and reveal behavior.
- `data/` — JSON indexes for projects, posts, and uploaded media.
- `files/` — Public downloadable documents, currently the resume PDF.
- `images/` — Branding, profile, article, and project imagery.

## Responsibilities

Keep reusable presentation, browser behavior, public data indexes, and static media here. Published article/project HTML belongs in `blog/` or `works/`; incoming content belongs in `uploads/`; repository automation belongs in `scripts/`.

## Important Notes

Paths are referenced by both root pages and nested pages, so preserve the existing absolute/relative URL conventions. Publishing scripts update `data/` and the `images/blog/` or `images/works/` subdirectories; manual edits must retain compatible field names and slugs.
