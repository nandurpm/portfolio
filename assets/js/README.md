# JavaScript

## Purpose

Browser-native behavior for public portfolio pages. These scripts run directly without bundling or third-party runtime dependencies.

## Contents

- `theme.js` — Applies saved light/dark preferences, handles storage denial, and activates the local-date Independence Day theme and banner.
- `main.js` — Provides navigation, accessible typing, contact fallback, safe hash scrolling and page initialization.
- `blog.js` — Searches, filters and paginates build-rendered cards without replacing their DOM nodes.
- `projects.js` — Filters and sorts the build-rendered project catalog.
- `reveal.js` — Configures and observes `data-reveal` elements, including stagger and reduced-motion handling.

## Responsibilities

Reusable public-page interaction logic belongs here. Content records belong in `assets/data/`, Content Studio code in `admin/`, and repository transformations in `scripts/`.

## Important Notes

The scripts are classic browser scripts rather than ES modules. `blog.js` depends on globals from `main.js`, and `reveal.js` listens for the `portfolio:content-rendered` event dispatched after dynamic updates. Preserve HTML load order, avoid Node-only APIs, escape untrusted metadata before inserting HTML, and retain reduced-motion fallbacks.
