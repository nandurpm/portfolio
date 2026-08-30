# Blog

## Purpose

Published long-form article pages linked from the blog index and represented in the blog JSON index.

## Contents

The directory currently contains articles about CNC precision, current affairs and technology careers, documentation, electronics, engineering design reviews, static portfolio architecture, learning technologies, movie reviews, and infrastructure engineering.

Each article is a standalone HTML document with descriptive metadata, shared public styles/scripts, a cover image reference, and navigation back to `blog.html`.

## Responsibilities

Only published article HTML belongs here. Incoming page/image pairs are staged in `uploads/blog/`; cover images belong in `assets/images/blog/`; card metadata belongs in `assets/data/blog.json`.

## Important Notes

Article filename, slug metadata, JSON `slug`/`url`, and image reference must remain aligned. The publisher owns normal additions and updates, while `render-static-content.mjs` owns generated card blocks in `blog.html` and `index.html`; do not hand-edit those blocks without updating their source data.
