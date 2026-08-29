# Workflows

## Purpose

Defines the automated static-content publishing pipeline for the portfolio.

## Contents

- `publish-content.yml` — Runs when staged blog or project uploads change, validates the upload set, regenerates public pages and indexes, and commits the generated result.

## Responsibilities

Use this folder for GitHub Actions orchestration only. Reusable validation and page-rendering behavior should remain in `scripts/` so it can also be run locally.

## Important Notes

- The bot-authored commit includes `[skip ci]` to prevent a publishing loop.
- The job deliberately fetches full history and rebases before pushing to reduce accidental overwrite risk.
- Review changes to the workflow's `git add` paths whenever the generated content structure changes.
