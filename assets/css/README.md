# CSS

## Purpose

Layered stylesheets for the public portfolio, generated content pages, reveal system, and annual event theme.

## Contents

- `main.css` — Core design system, components, forms, responsive rules, and presentation-deck visuals.
- `theme.css` — Full-viewport layout and page-level overrides for the header, hero, listings, and articles.
- `content-pages.css` — Project/blog listing and long-form page presentation imported by the primary style entry points.
- `animations.css` — Reusable typing/orbit animations and reduced-motion fallbacks.
- `reveal.css` — Initial/revealed states and timing variables used by `assets/js/reveal.js`.
- `polish.css` — Accessibility, focus, responsive typography, card, and reduced-motion refinements included in the generated CSS export.
- `independence-day.css` — Isolated 15 August event presentation activated by `theme.js`.
- `archive-showcase.css` — Dedicated engineering archive layout and repository directory presentation.

## Responsibilities

Put reusable public-site visual rules here rather than inline styles. Keep Content Studio styles in `admin/admin.css`, and keep a page-specific stylesheet isolated when it is not shared by the rest of the site.

## Important Notes

Run `node scripts/render-static-content.mjs` after editing CSS sources. It concatenates fonts, content-pages, theme, animations, main, polish, reveal, about, series, series-cinematic and navigation into `portfolio.css`, in that order. Public pages load this checked-in export with a content hash. `theme.js` only appends the optional Independence Day stylesheet. Page-specific archive styles remain separate. Preserve the cascade and reduced-motion rules when refactoring.
