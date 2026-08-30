# CSS

## Purpose

Layered stylesheets for the public portfolio, generated content pages, reveal system, and annual event theme.

## Contents

- `main.css` — Core design system, components, forms, responsive rules, and presentation-deck visuals.
- `theme.css` — Full-viewport layout and page-level overrides for the header, hero, listings, and articles.
- `content-pages.css` — Project/blog listing and long-form page presentation imported by the primary style entry points.
- `animations.css` — Reusable typing/orbit animations and reduced-motion fallbacks.
- `reveal.css` — Initial/revealed states and timing variables used by `assets/js/reveal.js`.
- `polish.css` — Accessibility, focus, responsive typography, card, and reduced-motion refinements loaded by `theme.js`.
- `independence-day.css` — Isolated 15 August event presentation activated by `theme.js`.
- `archive-showcase.css` — Dedicated engineering archive layout and repository directory presentation.

## Responsibilities

Put reusable public-site visual rules here rather than inline styles. Keep Content Studio styles in `admin/admin.css`, and keep a page-specific stylesheet isolated when it is not shared by the rest of the site.

## Important Notes

The files are loaded in a deliberate order by the HTML templates. `theme.css` and `animations.css` import `content-pages.css`; `theme.js` appends `polish.css` on every public page and conditionally appends `independence-day.css`. Preserve those cascade relationships and the reduced-motion rules when refactoring.
