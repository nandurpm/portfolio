# Portfolio audit verification and fixes

Verified against the local checkout on 20 October 2026. Changes are prepared locally; no production deployment, Git push, or Cloudflare account changes were made.

## Results

The main reported robustness, asset-weight, metadata, filtering, and sanitizer issues were reproducible and have been fixed. The original severity counts are not a verified vulnerability count: several findings combine recommendations, intentional behavior, and production checks that cannot be established from source alone.

| Finding | Verification and disposition |
| --- | --- |
| H1 | Confirmed. Reveal content is visible by default. Only successfully observed elements outside the initial viewport enter a hidden animation state. No-JS and blocked-reveal tests pass. |
| H2 | Confirmed. A synchronous head bootstrap applies the theme before styles; theme reads and writes tolerate denied storage. Tests cover denied storage and saved light preference while the system prefers dark and theme.js is blocked. |
| H3 | Confirmed. polish.css is a normal stylesheet on published pages and authoring templates. Runtime injection was removed. |
| H4 | Confirmed. The About heading uses heading/brand tokens. Its extracted about.css also replaces the two white surface fills with theme tokens. Light-theme screenshots were inspected. |
| H5 | The assets exclusion was confirmed and removed. Crawler exclusions are consolidated, include the editor, and use LF. Blank lines alone do not prove a robots.txt file malformed, and robots.txt is not access control. |
| H6 | Confirmed. Optimized WebP illustration and portraits, a dedicated thumbnail, intrinsic image dimensions, six deduplicated PNGs, and proven unreferenced legacy images removed. The PDF was compressed with matching extracted text, page size/count, and nearly identical rendered output. |
| H7 | Missing global headers and the weak blocklist were confirmed. Added global CSP, framing/MIME/referrer/permissions headers and asset caching; a separate editor script CSP; DOMPurify 3.4.17 with an HTML/attribute allowlist and protocol checks. Tokens now remain only in tab memory; old sessionStorage tokens are removed. A publicly served editor frontend does not itself grant publishing access: existing GitHub owner/write checks remain. Account-level Cloudflare Access remains optional hosting work. |
| M1 | Unverified in production. HTTPS HEAD requests to the live domain were denied by the environment's egress proxy (CONNECT 403), before reaching Cloudflare. Existing .html canonicals and rewrite behavior are retained pending evidence of final production URLs. |
| M2 | Partly incorrect. The checkout contains real OAuth start/config/callback JavaScript handlers, not only READMEs. Workers Assets does not run Pages Functions; corrected documentation and config comments, and made server OAuth explicitly opt-in so static hosting uses the existing device/token fallback. CNAME is harmless compatibility data and is retained; the generator no longer reads it. The GitHub Pages article is historical content, not deployment configuration, and is retained. |
| M3 | Confirmed. Sitemap excludes redirect stubs, includes both tracker information pages, and derives static lastmod from available Git history. Publishing stages the sitemap and CSP header updates. Sync checks out full history. |
| M4 | Confirmed for older content. The renderer now adds canonical, Open Graph and Twitter metadata to public pages and BlogPosting structured data to indexed articles. Existing article structured data is preserved. Project pages use their actual cover images where available. |
| M5 | Confirmed absolute reveal paths. Published pages, generators and upload templates now use relative reveal paths. HTTP remains the supported development workflow. |
| M6 | Confirmed duplicate CSS import chain. Replaced imports with ordered stylesheet links and a shared renderer head normalizer; tracker information pages receive the same stylesheet set and self-hosted fonts. The editor keeps its own design system. |
| M7 | Partly addressed. Extracted the About stylesheet, corrected theme-dependent surfaces, merged duplicate base tokens and removed unused component selectors. The main stylesheet and existing cascade remain; a complete visual-system rewrite was not required for these fixes. Accessibility and reduced-motion !important rules are retained intentionally. |
| M8 | Confirmed. Removed duplicate browser card renderers and startup JSON fetches. Home, blog and catalog use build-rendered HTML; browser search/filter/sort/pagination preserves the original nodes. No forced no-store JSON requests remain. |
| M9 | Confirmed. Removed the navigation helper and article tabindex/role. Every card has a single title link with a CSS stretched hit area. The blog index uses h2 card headings; home cards use h3. |
| L1 | Confirmed. Hash scrolling uses decoded IDs with malformed-encoding handling. Hash and pagination scrolling honor reduced motion. |
| L2 | Removed unused project-filter and slide-deck functions and inactive orbit/card/filter selectors. Empty media.json is retained as the editor's valid empty media index. |
| L3 | No active slide deck exists. Removing its dead code removes the dormant autoplay behavior. |
| L4 | Added visible email instructions, address copying, a prepared-message fallback and long-message handling. The no-JS form uses mailto POST rather than leaking form fields into a GET URL. The address remains public intentionally; obfuscation is not reliable spam protection. |
| L5 | Added a static screen-reader phrase and aria-hidden animated text, with useful initial text even without JavaScript. |
| L6 | Added light/dark media theme-color tags; manual theme changes update both. |
| L7 | Tracker HTML remains no-store; hashed /track/assets files get a year of immutable caching. Existing tracker meta CSP is preserved; the route header adds framing protection. |
| L8 | Shared writer concurrency, rebasing before sync push, staged-diff checks, and immutable action SHAs. Self-hosted Inter and JetBrains Mono replace Google Fonts. Public prose no longer calls the site dependency-free. |

## Validation

- `python3 tools/audit_links.py`: 30 HTML files, zero missing local references, zero duplicate IDs, zero missing titles. The audit now excludes Vite input, dependencies and caches; the private noindex tracker entry still has no description, which is a non-failing metadata warning.
- Node syntax checks passed for all 18 authored and vendored JavaScript modules in the public/editor/functions/scripts directories.
- Renderer repeatability: a second run changes no public HTML, sitemap or headers.
- Sitemap checks: 23 unique public URLs, both tracker information pages present, redirect/private/editor routes excluded.
- `node tools/test-portfolio.cjs`: 11 passing browser groups, including 23 mobile pages, loaded images, no horizontal overflow, CSP loading, no-JS navigation/content, failed reveal loading, stored/denied theme preferences, card node preservation, search/sort/pagination, unusual hashes, long contact messages, malicious HTML and URL payloads, and header matching.
- Visually inspected the desktop home and About light theme; fixed an additional dark caption/light text-token conflict and mobile archive-page grid overflow found during verification.

Final mobile Lighthouse runs used local HTTP with repository headers, Chromium 154, Lighthouse's default mobile throttling, and no server compression. They measure this checkout, not the production network/CDN:

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 93 | 100 | 100 | 100 | 3.0 s | 0 |
| Blog | 93 | 100 | 100 | 100 | 3.0 s | 0 |
| About | 93 | 100 | 100 | 100 | 2.9 s | 0 |

The first local Lighthouse pass detected a large navigation layout shift. Moving the JavaScript flag into the head bootstrap and using optional self-hosted fonts removed it. Performance scores vary between runs, and these LCP values still leave room for further CSS delivery optimization.

Approximate asset reductions (decimal bytes):

| Asset | Before | After |
| --- | ---: | ---: |
| Engineering illustration | 4,476,763 | 68,082 |
| Dedicated card thumbnail | Previously the illustration | 25,272 |
| Profile | 330,641 | 91,758 |
| About portrait | 301,368 | 59,522 |
| Resume PDF | 1,942,100 | 55,795 |

The PDF retains the same extracted text and 708×1000 test raster dimensions; average per-channel absolute pixel difference is under 0.27/255.

## Deployment follow-up

Deploy the generated HTML, images/fonts, `_headers`, `_redirects`, and sitemap together. Run `node scripts/render-static-content.mjs` after changes to the shared theme bootstrap or inline structured data so CSP hashes stay current. Commit generated headers and sitemap with generated pages.

After deployment, verify the actual .html versus extensionless redirect chain, canonical final URLs, route rewrites, and returned security/cache headers on the Cloudflare hosting mode in use. The regression server applies header rules locally but does not emulate Cloudflare routing or prove deployment settings. Configure Cloudflare Access through the hosting account if an additional editor access boundary is desired. GitHub publishing, OAuth credential exchange and Supabase sign-in were not exercised; tests use the editor's read-only local demo.
