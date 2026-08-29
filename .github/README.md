# GitHub Configuration

## Purpose

Contains repository automation for validating and publishing staged portfolio content.

## Contents

- `workflows/` — GitHub Actions workflow that converts reviewed uploads into generated public site pages and indexes.

## Responsibilities

Keep GitHub-hosted publishing orchestration here. Validation and rendering logic belongs in `scripts/`, staged author input belongs in `uploads/`, and generated public content belongs in the site folders maintained by the workflow.

## Important Notes

- The workflow has `contents: write` because it commits generated site files back to `main`.
- Never place OAuth secrets, personal access tokens, or unpublished private content in workflow definitions or logs.
