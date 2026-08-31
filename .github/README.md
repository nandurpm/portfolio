# GitHub Repository Configuration

## Purpose

This directory contains GitHub-specific automation for validating and publishing staged portfolio content.

## Contents

- `workflows/publish-content.yml` — Watches the two upload inboxes, runs the Node.js publisher and static renderer, then commits generated public-site files back to `main`.
- `workflows/README.md` — Documents the workflow directory, execution sequence, and maintenance boundaries.

## Responsibilities

Keep repository automation, workflow triggers, job permissions, and GitHub-only maintenance configuration here. Public-site code belongs in the application directories, while repeatable scripts invoked by workflows belong in `scripts/`.

## Security and Permissions

The publisher has `contents: write` because it commits generated files. It does not require OAuth secrets or user access tokens. Do not add secret values to workflow YAML, command output, or committed environment files; use GitHub or deployment secret storage when a future workflow genuinely needs a credential.

## Important Notes

The workflow ignores its own bot-authored commit through the job condition, preventing a generated-content loop. Trigger paths, branch names, script order, and the final `git add` list are part of the publishing contract and should be changed together with the corresponding scripts and documentation.
