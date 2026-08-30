# Images

## Purpose

Public branding, profile, content-card, article, and project artwork used throughout the portfolio.

## Contents

- Root files — Profile photos, logos, favicon, SVG interface icons, client/project logos, and legacy project artwork.
- `blog/` — Cover images whose basenames align with published blog slugs.
- `works/` — Project artwork whose basenames align with published project slugs.

## Responsibilities

Place reusable public images at this level. Published cover images belong in the matching content subdirectory, while their alt text and metadata stay in HTML and the JSON indexes. Private or unlicensed media must not be added.

## Important Notes

The publisher copies staged images into `blog/` or `works/` and records their paths in `assets/data/`. Preserve slug alignment when editing manually, and avoid renaming a linked asset without updating every HTML/JSON reference.
