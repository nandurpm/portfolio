# Static portfolio audit — 23 October 2026

Branch: `site-audit-fixes`. Baseline: `963d9d3932a1b35c0b8e4dbcd31043f208cd5a58`.

The portfolio remains plain HTML, CSS and JavaScript with no hosting build requirement. Public cards are rendered from `assets/data/works.json`, `github-projects.json` and `blog.json` by an optional existing publishing script. Runtime scripts enhance those static cards. The renderer now maintains shared navigation, footer, semantics and metadata. The embedded `/track/` application and `/admin/` Content Studio have separate code and security rules; this audit does not replace, rebuild or change their business logic.

## Quality evidence

Comparable mobile Lighthouse audits, Lighthouse 12.8.2 / Chromium 141, same GitHub-hosted runner, cold local static servers, default simulated mobile throttling. These are laboratory homepage results, not a guarantee of production latency or scores on every page.

| Category | Before | After |
| --- | ---: | ---: |
| Performance | 90 | 98 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

Verified run: https://github.com/nandurpm/portfolio/actions/runs/39894942785

Artifact: https://github.com/nandurpm/portfolio/actions/runs/39894942785/artifacts/12476825864 — raw Lighthouse JSON, browser results and full-page light/dark screenshots at 375px and 1440px.

- 25 public content pages × 6 widths × 2 themes = 300 successful viewport checks. Widths: 320, 375, 768, 1024, 1280, 1440px. No horizontal overflow, missing image attributes or skipped heading levels.
- axe WCAG A/AA scans on every public content page at 375px in both themes: no violations. Automated scans do not substitute for a full assistive-technology assessment.
- Mobile navigation, Escape-to-close, theme persistence, project search, blog pagination and no-JavaScript navigation pass.
- Current Nu HTML checker (`vnu-jar` 26.10.12): no errors in the portfolio pages and templates. Dynamic admin/tracker applications are intentionally excluded from static one-H1 rules.
- Static audit: 33 HTML files, no missing local references, duplicate IDs or public-page semantics/fragment errors. The noindex tracker app shell now has a description mirrored in its existing source; it remains separate from public search indexing.
- JavaScript syntax, whitespace and repeated-render idempotency checks pass.
- Hero assets: original 900×506 WebP 91,758 bytes; responsive 480×270 WebP 30,260 bytes; additional 768×432 variant. Original files and URLs remain available.
- OG image: 1200×630, 24,056 bytes, typography and schematic geometry rather than a profile photo.

The final regression run passes browser console-error, HTTP-error and image-decoding checks after the mobile caption/skip-link refinements. The subsequent redirect-title and tracker-description changes pass static validation; they do not change the homepage or measured layout.

## Complete task checklist

“Done” means implemented and checked within the public static portfolio scope. “Partial” names a specific limit; it does not imply a pass for unverified external services.

| Item | Status | Implementation / reason |
| --- | --- | --- |
| 0.1 Read structure first | Done | Inventoried tracked files, all public HTML, CSS, JS, images/fonts, publishing and hosting configuration; identified separate compiled app/editor boundaries. |
| 0.2 Organisation summary | Done | Static HTML, JSON-generated cards, progressive JS and repeated chrome maintained by renderer. |
| 0.3 Branch and logical commits | Done | `site-audit-fixes`; content/metadata, theme, performance and quality changes committed separately. |
| 0.4 Preserve links and meaning | Done | No existing page, image or route deleted or renamed; fragment destination `about.html#resume` repaired. Requested copy removals listed below. |
| 1.1 Duplicate hero tagline | Done | Replaced typing/hidden duplication with one literal, punctuated sentence. |
| 1.2 Separate hero title | Done | Two spans with real whitespace, independent layout and tested wrapping. |
| 1.3 Decorative badge | Done | Entire badge is `aria-hidden="true"`. |
| 1.4 Stars/date separation | Done | Flex gap, separator, named nonzero badge; no zero-star badges. |
| 1.5 Duplicate language | Done | Language displayed once among unique tech chips; removed repeated cover label. |
| 1.6 Consistent actions | Done | Only existing links rendered; common wrap/spacing and bottom alignment. |
| 1.7 Link arrows/attributes | Done | Internal forward links use →, external arrows use ↗, external anchors have target/rel. Back/download arrows retain their directional meaning. |
| 1.8 Date formats | Done | UTC `D MMM YYYY` with `time[datetime]` in cards and posts. |
| 1.9 WebP and image dimensions | Done | Converted six blog JPGs, retained originals; all public images have alt/dimensions/decoding. |
| 1.10 Meta-commentary removal | Done | Removed the requested homepage repository-visibility sentence. |
| 1.11 Footer/tool placement | Done | Tracker card on Projects; footer tool links moved into content; clear email label; GitHub and honest LinkedIn placeholder. Existing privacy/support links preserved. |
| 1.12 Meta keywords | Done | Removed through shared normalizer. |
| 1.13 Scan every page | Partial | Public-page HTML/assets/runtime/semantics checked. External scan: 47/70 HTTP 200, 20 timeouts, 3 HTTP 503; preserve unresolved destinations instead of inventing replacements. Separate applications are not redesigned. |
| 2.1 Engineering work and template | Done | Three explicitly marked draft cards on Home/Projects, draft page with four-part case structures, reusable template. Draft page noindex. |
| 2.2 Plain role under name | Done | “Electrical Design Engineer · Chennai”. |
| 2.3 Experience/tools strip | Done | Role/location plus explicit TODO tools and years. |
| 2.4 Optional social proof | Done | Hidden section awaits verified credentials/testimonials. |
| 2.5 26-tools suite | Done | Visible homepage feature links to existing archive. |
| 3.1 Design tokens | Done | Colours/type/spacing/radii/shadows/timing centralized in theme.css; public palette resolved through tokens. Component-specific geometry stays local. |
| 3.2 Palette/contrast | Done | Warm paper, dark ink, deep teal; contrast covered by axe in both themes. |
| 3.3 Dark mode | Done | Early bootstrap, system fallback, remembered manual toggle with guarded storage. |
| 3.4 Typography | Done | Georgia display, self-hosted Inter body and JetBrains Mono labels; swap/fallbacks and 65ch reading measure. |
| 3.5 Hero | Done | Portrait layout column, faint CSS blueprint grid, one primary and two secondary actions. |
| 3.6 Project previews/cards | Done | Original local schematic placeholder, real image slot, consistent lift/shadow and chips; no misleading screenshot attribution. |
| 3.7 Discipline icons | Done | Four small decorative inline SVGs alongside existing labels. |
| 3.8 Motion | Done | Gentle progressive reveals and new transitions opt in to no-preference; reduced-motion disables legacy hover movement. |
| 3.9 Layout rhythm | Done | Shared container/spacing/grid scale; responsive matrix passes. |
| 3.10 Cross-page consistency | Done | Shared public chrome and served design layer. |
| 4.1 Skip link/landmarks | Done | Focusable main destination and visible-on-focus skip link across public pages. |
| 4.2 Single blog link | Done | One stretched title link per card; “Read article” is decorative text. |
| 4.3 Alt text | Done | Existing meaningful descriptions retained; schematic decoration has empty alt. |
| 4.4 Focus/keyboard | Done | Shared focus-visible rules and keyboard navigation checks. |
| 4.5 Mobile tap targets | Done | Nav/buttons/card actions/footer links/pagination meet 44px; inline prose links retain normal reading flow. |
| 4.6 Heading order | Done | One H1 and no skipped levels on public content pages; redirect fallbacks also receive H1. |
| 4.7 Mobile nav semantics | Done | Expanded/controls, controlled nav ID and Escape focus return. |
| 4.8 Language/form labels | Done | Public pages en; existing labelled contact fields preserved. |
| 5.1 Social card | Done | New 1200×630 OG PNG and complete OG/Twitter dimensions/alt metadata. |
| 5.2 Structured data | Partial | Person on Home/About and BlogPosting on each article. GitHub is real; LinkedIn deliberately absent until user supplies a genuine URL. |
| 5.3 Page metadata | Done | Unique titles/descriptions, canonicals and OG on public portfolio pages; app shell remains noindex and separate. |
| 5.4 Sitemap/robots/404/icons | Done | Regenerated sitemap excludes noindex drafts; existing robots valid; branded 404, ICO/32/180/192/512 PNG and manifest. |
| 5.5 Domain note | Done | CNAME/DNS/host/canonical guidance in README; current domain unchanged. |
| 6.1 Image loading | Done | Lazy/async below fold, high-priority responsive hero preload. |
| 6.2 Hero size | Done | Original under 150KB plus 480/768 variants, srcset and sizes. |
| 6.3 Minification/unused code | Done | Optional isolated npm minification export; unused typing JS and presentation-deck CSS removed. Checked-in shared CSS export reduces blocking requests without a hosting build. |
| 6.4 Layout stability | Done | Explicit image dimensions/ratio and stable font fallbacks; verified layouts. |
| 6.5 Lighthouse 95+ aim | Done | Measured homepage 98/100/100/100 on the verified runner. |
| 7.1 Width/theme tests | Done | All requested widths plus 1280px; both themes; 300 page checks. |
| 7.2 W3C HTML validation | Done | Current Nu checker passes. Older html5validator bundle rejected modern valid attributes, so it was replaced with current vnu-jar for testing. |
| 7.3 Console/assets/links | Partial | Internal assets/fragments pass; browser checks included. External hosted services have unresolved timeouts/503s listed below. |
| 7.4 Before/after Lighthouse | Done | Comparable raw reports, scores and limitations recorded. |
| D1 Commits/PR/checklist/scores/TODOs/decisions | Done | Branch, logical commits, this report and PR description. |
| D2 Content removals listed | Done | Complete list below; no existing files deleted. |
| D3 Safe assumptions | Done | Listed below; no invented professional claims or account URLs. |

## TODOs to fill in

All new placeholder content contains `TODO: replace with real details`.

1. Home experience strip: confirm which of AutoCAD, EPLAN, JavaScript, TypeScript and Python belong in your actual tools list; enter verified years of experience.
2. Three draft topics (wiring logic, design review checklist, panel layout documentation): fill problem/constraints, your personal contribution, verified outcome and lesson, in the cards on Home and Projects and the detailed draft page.
3. Case-study evidence: add permitted drawings/screenshots, captions and meaningful alt text. Do not publish confidential employer/customer information; the drafts explicitly remind you to verify permission.
4. Reusable case-study template: replace the TODO title/details when copying it; remove unused draft sections and noindex only when ready to publish.
5. Social proof: enter a real certification title/issuer/credential URL or a testimonial with permission, then remove `hidden` only after verification.
6. LinkedIn: replace the shared footer span with the actual external profile link and add that same real URL to Person.sameAs in `scripts/site-pages.mjs`. Footer TODO comments are generated from this one source.
7. Legacy upload templates still contain their original “Replace with …” fields (slug, title, date/category, image, article/project text, optional demo/GitHub). They remain templates, not published claims.

No new API key, credential, account connection, certification or employer detail is required for the public portfolio. The existing Content Studio OAuth client setting is outside this audit.

## Content removed or relocated

- Removed the duplicate hero typing text/hidden repetition and its now-unused typing controller; retained the complete intended focus sentence once.
- Separated the existing name and Engineering Series title and added the requested plain role line.
- Removed only this requested homepage sentence: “Repository visibility is respected: only public projects appear here.”
- Hid zero-star badge content and removed duplicate cover language labels; nonzero counts and every underlying project record remain.
- Replaced raw/short dates with equivalent human-readable dates, preserving the source machine date. The no-JavaScript catalog count is now derived from the same project data (33 rather than the stale 32).
- Removed meta-keyword tags.
- Moved the homepage footer’s Expense and Savings Tracker link to a Projects card. Tracker information-page footer links also have an in-content destination; privacy and app-support links remain.
- Replaced footer label “Email” with “Email Nandakumar”; removed the homepage footer sentence “Built with HTML, CSS, and JavaScript.” and the legacy project-page footer text “Built for GitHub Pages.” The stack and hosting remain documented in README.
- Normalized the nav label “Blog” to “Articles” and added missing Contact entries without removing destinations.
- Replaced the crimson/charcoal design rules and native horizontal project rail with teal/paper styling and responsive grids. Removed unused presentation/deck/demo CSS, not authored page content.
- No existing page, article, project, original image, public route or filename is deleted. JPG and historical font/style assets remain accessible for compatibility.

## Decisions and assumptions

- Deep teal provides an engineering association and readable contrast on warm off-white; accent use is limited to actions, links, focus and key numbers.
- Georgia provides display character without another font download; existing self-hosted Inter and JetBrains Mono handle body/labels.
- Generic schematic project artwork is decoration, not a claim that an unrelated screenshot belongs to a project.
- The Engineering Series name stays as visual flavour; the role is explicit and the name/subtitle are separate elements.
- Draft engineering topics are not completed-project claims. No employer, certification, metric or result is inferred.
- LinkedIn uses a noninteractive placeholder; a guessed URL would be misleading and invalid structured data.
- Existing legacy filenames whose case-study titles differ are preserved as requested. Their original content is retained; professional outcome claims should be verified by the owner before being used as evidence.
- Existing `/track/` compiled assets/source and `/admin/` are separate apps. Only the tracker shell’s description is mirrored in its existing source; business logic, privacy wording, credentials and build system are not changed by a portfolio design audit.
- The existing optional publishing renderer also exports one checked-in shared CSS file. Hosting still serves static files directly; original readable stylesheet URLs remain available.
- External demo hosting recovery is outside this repo’s front-end scope. Timeouts/503s do not justify changing user-owned URLs to invented alternatives.
- Robots, CNAME and domain are preserved. No merge or production deployment is performed by this PR.

## External destinations requiring review

Observed with HTTP GET requests on 23 October 2026, 18-second timeout. These are service availability observations, not proof of a permanently broken destination. Existing links remain intact.

| URL | Observation |
| --- | --- |
| https://boot-inspector.onrender.com | Timed out; not verified |
| https://command-center-3dwl.onrender.com | Timed out; not verified |
| https://component-vault.onrender.com | Timed out; not verified |
| https://diagram-script.onrender.com | Timed out; not verified |
| https://digital-life-dashboard.onrender.com | Timed out; not verified |
| https://electrical-troubleshooter.onrender.com | Timed out; not verified |
| https://energy-monitor-3ckp.onrender.com | Timed out; not verified |
| https://folder-archaeologist.onrender.com | Timed out; not verified |
| https://lan-map.onrender.com | HTTP 503 |
| https://machine-logbook-a949.onrender.com | Timed out; not verified |
| https://mini-tool-factory.onrender.com | HTTP 503 |
| https://motor-toolbox.onrender.com | Timed out; not verified |
| https://pcb-component-finder.onrender.com | Timed out; not verified |
| https://privacy-inspector.onrender.com | Timed out; not verified |
| https://project-digital-twin.onrender.com | Timed out; not verified |
| https://question-machine.onrender.com | Timed out; not verified |
| https://repo-time-machine.onrender.com | HTTP 503 |
| https://resistor-vision-artu.onrender.com | Timed out; not verified |
| https://screen-explainer.onrender.com | Timed out; not verified |
| https://storage-forensics.onrender.com | Timed out; not verified |
| https://system-change-tracker.onrender.com | Timed out; not verified |
| https://tech-calc.onrender.com | Timed out; not verified |
| https://wifi-heatmap.onrender.com | Timed out; not verified |

## Concurrent main-branch update

Main commit `08a32077b691c00419de327590f9f7b46e0f2f44` improved the hero photo visibility during this audit. The branch incorporates it: the new layout uses an unobscured, fully opaque portrait column and retains its contrast/saturation adjustment. The old text-over-image gradients no longer apply because text has its own column. The conflict was resolved without discarding the visibility intent.
