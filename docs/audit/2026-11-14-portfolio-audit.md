# Portfolio website audit follow-up — 14 November 2026

## Audit information and scope

Baseline `c04df4d8f702b7a7764ee9693810f41efbab6255`; branch `fix/portfolio-audit-20261114`. Initial tree clean, no open PRs. This follows the user-supplied **portfolio website** report, not a new audit of tracker accounting or native applications. The user authorized fixes and website publication. Tracker source, generated tracker assets, 2.10.13 version, binaries, signing, production records, authentication and database schema are unchanged.

## Confirmed defects and corrections

| Finding | Status | Evidence / root cause | Correction and regression |
| --- | --- | --- | --- |
| H1 / H2 — nested 404 and routes | RESOLVED in source; live verification required after deploy | Before changes, `curl -IL https://nandakumarm.dpdns.org/about/` returned 404. Relative assets/navigation in `404.html` resolve against the missing URL. Workers did not specify custom not-found behavior and aliases used 200 rewrites. | Root-relative public attributes, Workers `404-page` and explicit `.html` handling, 301 aliases. Real small directory redirects also support GitHub Pages. Custom 404 has no invented canonical/social URL. Static and browser route checks. |
| H3 — tracker information contradicts actual web application | RESOLVED | Info page denied a browser tracker despite `/track/`; privacy described only native storage. Browser source uses localStorage for plan/recovery data and sessionStorage for authentication. | Link web app and official releases; distinguish required browser sign-in from installed local mode; document browser storage. No financial or auth code changes. Static checks and link audit. |
| H4 — résumé destination lacks PDF | RESOLVED | `resume.html` redirects to About but that section had no PDF link. | Direct existing PDF download in About and redirect fallback; minimal noindex redirect documents without JS/full chrome. Static PDF signature and browser navigation checks. |
| M1 — inconsistent cache keys | RESOLVED | Shared assets had page-specific historical version strings; listing scripts had none. | Content-derived SHA-256 prefixes for local public CSS/JS; same content gets same key on every page. Missing assets fail generation. Unit/content hash tests. |
| M2 — growing executable-script hash list | RESOLVED in source; browser check required | Every JSON-LD data block generated another script hash despite not being executable JavaScript. | Hash executable inline scripts only; static regression verifies the exact distinction; browser suite records CSP violations. |
| M3 — unnecessary runtime and deployable source directories | RESOLVED in configuration | No server-side Worker uses nodejs compatibility; CONTENT_PUBLISHING.md and reports absent from asset exclusions. | Remove unused flag; extend ignore file. Tests verify sensitive build/source directory exclusions. This is packaging hygiene, not authentication. |
| Catalog sorting, counts and announcements | RESOLVED | Only the additional grid sorted; 34-project total sat under 26 additional records; two empty messages and broad live grids. | Sort within both collections, explicit overall matching count plus separate collection totals, one empty message, scoped status output. Preserve all 34 projects and DOM nodes. Browser regression. |
| Blog filtering accessibility | RESOLVED | Visible Category label overridden by different aria-label; no matching count; pagination represented as a group. | Native label, result status, navigation landmark; retain pagination focus/reduced-motion behavior. Browser regression. |
| Metadata precedence / presentation | RESOLVED in part | Curated language overwritten by repository-wide classification; placeholder descriptions repeated; date formatting differed between renderer and normalizer; star label always plural. | Curated language wins, repository stars/update remain dynamic, omit absent descriptions instead of inventing project details. Deterministic UTC English dates, singular star label, decorative card image alt; article social metadata uses its actual supplied image. |
| Sitemap modification dates | RESOLVED | Publication dates / HTML-only git history do not establish last modification; noindex filtering matched arbitrary text. | Omit unverified lastmod and inspect robots meta directive. |
| Theme preference / light tokens | RESOLVED | Default ignored system preference; bootstrap/browser colors inconsistent with saved override; light ink/danger tokens inherited dark values. | Early system-aware bootstrap and metadata, saved override honored, OS changes followed only until explicit choice, denied storage fallback, no-JS light palette, corrected light tokens; raise sub-10px subtitle/badge text to 12px. CI screenshots confirm busy scenery behind Home copy at 1100px; strengthen the existing photographic fade, constrain mid-desktop copy, and add a visible scroll-rail hint. Browser regression includes storage denial. |
| M7 / copy — unsupported archive claims | RESOLVED in part | Archived CNC concept claimed production testing and measured yield benefits without evidence; portfolio archive described obsolete runtime rendering. | Remove unsupported results, mark concept limits, document actual static rendering, clarify JSON links. About working-principle labels express intent; no invented achievements or personal facts. |
| Documentation and generated publication | RESOLVED | README claimed absent Static portfolio audit/Nu/Lighthouse CI; CSS docs described runtime polish injection; publishing staged only a subset of normalized pages. | Document actual CSS export, routing, current tests and limits; preserve historical audit with supersession notice. Add real portfolio CI; publishing stages all public normalized outputs. |

## Verification

Commands from repository root unless noted:

- `node scripts/render-static-content.mjs` — PASS: 8 featured projects, 26 additional repositories, 10 articles; all public pages/CSS/CSP generated.
- `node --test tools/test-portfolio-audit.mjs` — PASS: 8 regression groups, including rerender idempotence.
- `python tools/audit_links.py` — PASS: 37 HTML files; zero missing local references, duplicate IDs, absent titles/descriptions, or public semantic/anchor findings.
- `node --check scripts/site-pages.mjs`, `node --check scripts/render-static-content.mjs`, `node --check assets/js/projects.js`, `node --check assets/js/theme.js` — PASS.
- `git diff --check` — PASS.
- `CHROMIUM_PATH=/usr/bin/chromium node tools/test-portfolio-browser.cjs` — BLOCKED locally: Chromium aborts at `process_singleton_posix.cc` because socket creation is not permitted. No local browser result is claimed.
- New `.github/workflows/portfolio-quality.yml`: dependency-free static/link checks, pinned browser tooling installation, Chromium, interaction tests, six viewport widths × two themes × six pages, axe serious/critical checks on seven primary pages, no-JS and storage-denial cases. CI results must be read on the actual PR head before publication. Its HTTP server simulates static routing/headers; it does not prove Cloudflare configuration.

No Nu validator, Lighthouse score/performance measurements, physical mobile testing, Supabase sign-in, private editor publishing, credential rotation, or native builds are claimed for this website-only change. Existing old `tools/test-portfolio.cjs` is retained; its hardcoded counts/styles are historical and not the current suite.

## Deferred / potential findings and owner decisions

- **M2 CSP remaining hardening:** JSON-LD data blocks are excluded from executable-script hashes, with a regression checking the exact executable allowlist; browser tests monitor policy violations. Inline styles and HTTPS images remain allowed for existing content/editor compatibility. Further tightening needs a complete content inventory.
- **M4 editor access:** frontend and manual-token fallback remain features; not removed to make an audit pass. No stored token/credential is added. Cloudflare Access and enforcement on the actual serving host require hosting-account configuration. Noindex is not access control. GitHub Pages does not apply `_headers`; live response headers must be assessed on the deployed host.
- **M5/M6 content:** no descriptions, metrics, employment/client permissions or language claims are invented. Curated copy is preserved; absent repository descriptions are omitted. Repository-wide language remains a classification, not proof of every component's stack. Further editorial case studies need owner evidence.
- **M8 credentials/legal/privacy:** historical credential rotation, client permission, employer details, personal contact publication, PolyStudy naming, account deletion retention deadlines and India privacy-law obligations need owner review. Revised policy describes verified behavior and does not invent a compliance certification or deletion promise.
- **M9/editorial/UI:** article categories and images remain intentional owner content; no articles/projects/features removed. Shared CSS still has an established layered cascade; blanket dead-code pruning or a broad visual redesign is deferred. Portrait composition, duplicate visual introductions, case-specific screenshots, further mobile type refinement need visual review against the approved design. No unverified performance/contrast claim is made.
- Mail composer still depends on the visitor's configured email client; existing explicit email/copy fallback remains. A new production form backend would require separate service/abuse-handling configuration.
- Public external demos were not stress-tested or guaranteed continuously available. Nothing in this patch establishes application correctness, production security, or consent.

## Release record

Website publication only. See the associated PR for exact fix commits, CI run, merge and deployment evidence. This report is checked in before deployment; PR/release notes and the final response carry observed production results. No new APK/EXE release is necessary for these portfolio changes.

### Executed CI evidence before publication

[Run 43566190304](https://github.com/nandurpm/portfolio/actions/runs/43566190304), commit `7f0d173bf5bff6d9e6159a7550cb147d6ac17f72`: **PASS**. Eight static groups and the 37-file local reference audit passed. Eight browser groups passed, including 72 page/theme/viewport combinations with no horizontal overflow or CSP violations, system/saved/denied-storage theme cases, both project collections' sort/search, blog pagination, nested 404, résumé/alias navigation and no-JS content. Axe found no serious/critical WCAG A/AA violations across seven primary pages **in both themes**; this is automated scoped evidence, not complete accessibility certification. Screenshots and full axe JSON are in the run's `portfolio-browser-evidence` artifact.

The first browser run failed because its assertion did not wait for the asynchronous OS theme event. The test now waits for the observed theme change; no application exception was suppressed. CI results on subsequent PR commits remain authoritative. A final wording-only adjustment names the legacy download as the project index (JSON), preserving the download action.
