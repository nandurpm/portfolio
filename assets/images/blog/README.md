# Blog Images

## Purpose

Contains public cover images for articles in `blog/` and card records in `assets/data/blog.json`.

## Contents

The current `blog-1.jpg` through `blog-6.jpg` files provide artwork for the published article set. New automated publications normally use a slug-based filename such as `article-slug.jpg`.

## Responsibilities

Store only optimized, publication-ready blog artwork here. Article HTML and metadata belong in `blog/` and `assets/data/blog.json`; incoming files belong in `uploads/blog/`.

## Important Notes

`scripts/publish-content.mjs` copies validated staged cover images into this directory. Keep each JSON/HTML reference synchronized with the actual filename and retain meaningful alt text in the consuming page.
