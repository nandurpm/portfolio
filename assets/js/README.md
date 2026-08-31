# JavaScript

## Purpose

Browser-native behavior for public portfolio pages. These scripts run directly without bundling or third-party runtime dependencies.

## Contents

- `theme.js` — Applies saved light/dark preferences, loads cross-page polish styles, and activates the local-date Independence Day theme and banner.
- `main.js` — Provides shared JSON loading, safe card rendering, project filters, navigation, typing, contact, presentation-deck, and page initialization behavior.
- `blog.js` — Loads blog records and manages search, category filters, pagination, and static-card fallback behavior.
- `blog-card-navigation.js` — Makes the complete blog-card surface keyboard/click navigable after static or dynamic rendering.
- `reveal.js` — Configures and observes `data-reveal` elements, including stagger and reduced-motion handling.

## Responsibilities

Reusable public-page interaction logic belongs here. Content records belong in `assets/data/`, Content Studio code in `admin/`, and repository transformations in `scripts/`.

## Important Notes

The scripts are classic browser scripts rather than ES modules. `blog.js` depends on globals from `main.js`, and `reveal.js` listens for the `portfolio:content-rendered` event dispatched after dynamic updates. Preserve HTML load order, avoid Node-only APIs, escape untrusted metadata before inserting HTML, and retain reduced-motion fallbacks.
