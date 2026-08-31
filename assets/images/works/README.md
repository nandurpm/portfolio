# Project Images

## Purpose

Contains public artwork for project pages in `works/` and cards represented by `assets/data/works.json`.

## Contents

The existing `project-*` image files support the current engineering, website, documentation, and Diploma Notes project records. New automated publications normally use a slug-based filename.

## Responsibilities

Store only finalized public project artwork here. Project descriptions and URLs belong in `works/` and `assets/data/works.json`; incoming files belong in `uploads/projects/`.

## Important Notes

`scripts/publish-content.mjs` copies validated project images into this directory. Renaming or removing an image requires updating all corresponding HTML and JSON references.
