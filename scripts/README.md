# Scripts

## Purpose

Contains repeatable Node.js automation for staging, validating, publishing, and rendering portfolio content.

## Contents

- `create-blog-post.mjs` — Validates article metadata/content and stages a complete blog page plus optional cover image.
- `publish-content.mjs` — Validates staged blog/project uploads, moves approved assets, and updates structured content indexes.
- `render-static-content.mjs` — Rebuilds public homepage, blog, and project cards from the maintained JSON indexes.

## Responsibilities

Repository publishing rules and deterministic generation belong here. Browser editor behavior belongs in `admin/`, author templates belong in `templates/`, and GitHub-hosted orchestration belongs in `.github/workflows/`.

## Important Notes

- Run scripts from the repository root so relative paths resolve correctly.
- The workflow invokes publishing before static rendering and commits only the expected generated paths.
- Treat upload content as untrusted input and preserve the existing metadata, path, and extension validation.
