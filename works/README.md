# Works

## Purpose

Published project and work-sample pages. The subset surfaced as generated cards is represented in the project JSON index.

## Contents

- `archive-tool-suite.html` — Engineering archive overview and directory of the related public tool repositories.
- `diploma-notes.html` — Diploma Notes education-platform case study.
- `engineering-projects.html` — Electrical/electronics engineering work overview.
- `escalator-sticker-designs.html` — Escalator sticker-design work sample.
- `technical-documentation.html` — Technical documentation work sample.
- `website-design.html` — Website-design work sample.

## Responsibilities

Only public project/work HTML belongs here. Incoming HTML/image pairs are staged in `uploads/projects/`; project artwork belongs in `assets/images/works/`; card metadata belongs in `assets/data/works.json`.

## Important Notes

Project filename, slug metadata, JSON `slug`/`url`, and image reference must remain consistent. `render-static-content.mjs` owns generated project-card blocks in `projects.html` and `index.html`. The archive page also depends on `assets/css/archive-showcase.css` and links to external repositories, which the local link audit does not verify.
