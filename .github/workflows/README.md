# Workflows

## Purpose

Contains executable GitHub Actions definitions for repository automation.

## Contents

- `publish-content.yml` — Publishes staged blog posts and project pages from pushes to `main` that touch `uploads/blog/**` or `uploads/projects/**`; it may also be started manually.

## Execution Order

1. Check out the complete repository history.
2. Select Node.js 22.
3. Validate and publish staged uploads with `scripts/publish-content.mjs`.
4. Regenerate static cards with `scripts/render-static-content.mjs`.
5. Commit and push generated site files when the working tree changed.

## Responsibilities

Workflow orchestration belongs here. Content parsing and generation logic stays in `scripts/` so it remains runnable and reviewable outside GitHub Actions.

## Important Notes

The workflow intentionally uses `contents: write`, serializes publisher runs through a concurrency group, and does not cancel a publication already in progress. Keep the bot-actor guard and non-force push behavior unless the publication model changes.
