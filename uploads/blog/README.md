# Blog Upload Inbox

## Purpose

Stages complete blog article HTML/image pairs for the automated publisher.

## Contents

The directory is normally empty except for `.gitkeep` and this guide. A pending publication adds `<slug>.html` plus a matching `<slug>.<supported-image-extension>`.

## Responsibilities

Place only reviewed article upload pairs here. Authoring templates live in `templates/`, published pages in `blog/`, cover images in `assets/images/blog/`, and article records in `assets/data/blog.json`.

## Important Notes

The HTML must contain the required `post-*` metadata documented in `CONTENT_PUBLISHING.md`. A push touching this directory starts the publishing workflow; successful processing removes the staged pair, publishes the page/image, updates the index, and regenerates static cards.
