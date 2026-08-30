# Scripts

## Purpose

Dependency-free Node.js automation for staging, validating, publishing, and rendering portfolio content.

## Contents

- `create-blog-post.mjs` — Validates metadata/body/image inputs and creates a complete HTML/image pair in `uploads/blog/`.
- `publish-content.mjs` — Validates staged blog/project metadata and matching images, publishes pages/assets, upserts JSON indexes, and removes processed staging files.
- `render-static-content.mjs` — Reads the JSON indexes and replaces the named generated-card blocks in `index.html`, `projects.html`, and `blog.html`.

## Responsibilities

Use this directory for deterministic repository transformations that must run both locally and in CI. Browser interactions belong in `assets/js/` or `admin/`; one-off maintenance checks belong in `tools/`.

## Important Notes

The scripts use only built-in Node.js modules and are run from the repository root. The workflow runs `publish-content.mjs` before `render-static-content.mjs`, then commits generated outputs. Preserve JSON array schemas, upload metadata names, and the `*_START`/`*_END` HTML markers. Review diffs because the publisher intentionally moves/removes staging files.
