# Project Upload Inbox

## Purpose

Stages complete project page HTML/image pairs for the automated publisher.

## Contents

The directory is normally empty except for `.gitkeep` and this guide. A pending publication adds `<slug>.html` plus a matching `<slug>.<supported-image-extension>`.

## Responsibilities

Place only reviewed project upload pairs here. Authoring templates live in `templates/`, published pages in `works/`, images in `assets/images/works/`, and project records in `assets/data/works.json`.

## Important Notes

The HTML must contain the required `project-*` metadata documented in `CONTENT_PUBLISHING.md`. A push touching this directory starts the publishing workflow; successful processing removes the staged pair, publishes the page/image, updates the index, and regenerates static cards.
