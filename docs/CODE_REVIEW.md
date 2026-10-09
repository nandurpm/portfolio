# Code review — portfolio (`450d208`, branch `cline/fhraa4mb`)

Scope: the whole repository — static pages, `assets/js`, `assets/css`, `admin/` (Content Studio),
`functions/api/github/oauth/`, `scripts/*.mjs`, `tools/audit_links.py`, `.github/workflows/`,
`.assetsignore`, `wrangler.jsonc`, `_redirects`, `robots.txt`, `sitemap.xml`.

How findings were produced: every item below was read directly in the source. Items marked
**[reproduced]** were additionally executed against a scratch copy of the repo (Node scripts) or a
scratch git remote (workflow behaviour). Items marked **[analysis]** are reasoning over code that was
read but not executed. Nothing here is speculative.

Baseline checks that currently pass: `python3 tools/audit_links.py` → 0 missing refs, 0 duplicate IDs,
0 missing titles/descriptions, exit 0; `node --check` on all 12 JS/MJS files → clean;
`render-static-content.mjs` is byte-for-byte idempotent on the checked-in tree.

---

## Summary

| # | Severity | Area | Finding | Confidence |
|---|----------|------|---------|------------|
| A1 | **High** | CI | Content publishing workflow aborts on every new post/project (`git pull --rebase` with unstaged `sitemap.xml`) | reproduced |
| B1 | **High** | Security | `create-blog-post.mjs` JSON-LD `</script>` breakout → stored XSS in published articles | reproduced |
| B2 | **High** | Security | `create-blog-post.mjs` interpolates `image` into HTML attributes unescaped → `onerror` XSS | reproduced |
| C1 | **High** | UX/SEO | All main page content is `opacity:0` without JavaScript — pages render blank | reproduced |
| B3 | High | Security | Published content is an unsanitized trust boundary on the same origin as the admin token | analysis |
| B4 | Medium-High | Security | Admin "Edit published page" injects repo HTML into the DOM without `sanitizeContent()` | analysis |
| B5 | Medium-High | Security | `formatDate()` returns raw input; two `innerHTML` sinks do not escape it | analysis |
| D1 | Medium | SEO | 9/10 articles and 5/6 project pages ship without canonical/OG/JSON-LD, though the generator emits them | reproduced |
| A2 | Medium | Correctness | `resume.html` redirects to `about.html#resume`, which does not exist; the audit tool cannot see it | reproduced |
| B8 | Medium | Deploy | Two contradictory deployment models declared (Pages `functions/` vs assets-only Worker); OAuth may 404 | analysis |
| B6 | Medium | Security | `sanitizeContent()` is bypassable and is only applied on the write path | analysis |
| E1 | Medium | Perf | 4.3 MB unoptimized hero PNG used as card image, article hero and `og:image` | reproduced |
| F1 | Medium | Structure | Header/nav/footer duplicated in 22 files; ~500-line inline stylesheet in `about.html` | reproduced |
| A5 | Low | SEO | Sitemap lists redirect stubs whose canonicals point elsewhere; omits `diploma-notes.html` | reproduced |
| C2 | Low | UX | `polish.css` is injected by `theme.js` at runtime — styling depends on JS (FOUC) | reproduced |
| C3 | Low | SEO | `robots.txt` disallows `/assets/`, blocking the CSS/JS the pages need | reproduced |
| C5 | Low | UX | With JS off the contact form does a real GET submit, contradicting the on-page privacy claim | analysis |
| A3 | Low | Correctness | `document.querySelector(window.location.hash)` throws on fragments like `#1` or `#!` | analysis |
| A4 | Low | Correctness | `post-image` in one article points at a non-existent path, breaking re-publish | reproduced |
| B7 | Low | Security | `javascript:`/`data:` URLs from repo JSON pass through `escapeHtml` into `href` | analysis |
| F2..F4 | Low | Style | Escaping helpers duplicated 4×, mixed absolute/relative asset paths, `window` globals | reproduced |


---

## A. Correctness / release-blocking bugs

### A1 — [High] [reproduced] Content publishing fails every time new content is added

`.github/workflows/publish-content.yml:55`

```yaml
git add index.html blog.html projects.html blog works assets/data assets/images uploads
...
git pull --rebase origin main
git push origin HEAD:main
```

`scripts/render-static-content.mjs:145` calls `renderSitemap(...)`, which rewrites `sitemap.xml`
whenever a post/project is added (`render-static-content.mjs:106-119`). `sitemap.xml` is **absent from
the `git add` list**, so after the `git commit` it is still an unstaged modification to a tracked
file. GitHub Actions runs `run:` blocks under `bash -e`, so:

1. `git add` commits everything except the sitemap;
2. `git status --porcelain` is still non-empty (` M sitemap.xml`);
3. `git pull --rebase origin main` refuses to rebase with a dirty tree.

Reproduced end-to-end on a scratch remote (tracked `sitemap.xml`, one upstream commit, one local
publish commit): `error: cannot pull with rebase: You have unstaged changes.` — **exit 128**. The
`git push` never runs, so the publish commit is discarded with the runner and the article/project is
never served. This fires precisely on the documented happy path, because adding content is what
changes the sitemap.

The sibling workflow does it correctly — `.github/workflows/sync-public-projects.yml:33` includes
`sitemap.xml` in its `git add`, which is strong evidence this is an oversight rather than intent.

Fix: add `sitemap.xml` to the `git add` list, and/or use `git add -A` with the existing
"nothing to commit" guard (or `--autostash`) so future generated files cannot reintroduce the bug.

### A2 — [Medium] [reproduced] `resume.html` redirects to an anchor that does not exist

`resume.html:10,12,17` all target `about.html#resume`:

```html
<meta http-equiv="refresh" content="0; url=about.html#resume">
<link rel="canonical" href="https://nandakumarm.dpdns.org/about.html#resume">
<script>window.location.replace("about.html#resume");</script>
```

`about.html` contains **zero `id` attributes** (`grep -c 'id="' about.html` → 0), so the fragment
resolves to nothing: visitors land at the top of the About page, and the canonical URL advertises a
fragment that does not exist.

Related: `tools/audit_links.py:52` returns `None` when a reference starts with `#`, and treats
`about.html#resume` as the plain path `about.html`, which exists — so the repo's own audit reports
"Missing local references: 0" and cannot catch this class of bug. `resume.html` is also orphaned: the
only reference to it anywhere is `sitemap.xml:7`; no page links to it (`index.html` and `contact.html`
link straight to `assets/files/resume.pdf`).

Fix: give the resume section in `about.html` `id="resume"` (and make `audit_links.py` validate
fragments), or point `resume.html` at `assets/files/resume.pdf`.

### A3 — [Low] [analysis] `querySelector()` on an arbitrary URL fragment can throw

`assets/js/main.js:372`

```js
const target = document.querySelector(window.location.hash);
```

The hash is visitor-controlled URL text. `#1`, `#!`, `#a b` and similar are invalid CSS selectors, so
`querySelector` throws `SyntaxError` and aborts the rest of the `DOMContentLoaded` handler. A guard
(`document.getElementById(hash.slice(1))`) fixes it.

### A4 — [Low] [reproduced] Broken `post-image` path in a published article

`blog/honest-software-boundaries.html:19`

```html
<meta name="post-image" content="../archive-engineering-hero.png">
```

The real asset is `assets/images/archive-engineering-hero.png` (the same page uses the correct path at
line 45). `publish-content.mjs:179` feeds this value to `resolveImage`, which requires the filename to
match the slug (`publish-content.mjs:107-109`) and rejects anything that is not a known image
extension or an existing `assets/...` path — so re-publishing this article after an edit fails with
`Referenced image does not exist`.

### A5 — [Low] [reproduced] Sitemap contains redirect stubs and misses a real page

`scripts/render-static-content.mjs:108` hardcodes:

```js
const topLevelPages = ['', 'about.html', 'projects.html', 'blog.html', 'resume.html', 'contact.html', 'works.html'];
```

`resume.html` and `works.html` are meta-refresh stubs (`resume.html:10`, `works.html:10`) whose own
`rel="canonical"` points at `about.html`/`projects.html` — listing them in the sitemap while their
canonicals point elsewhere sends contradictory signals. Meanwhile `diploma-notes.html`, a real
(redirecting) page, is deliberately excluded, so the exclusion rule is applied inconsistently.

---

## B. Security

Context for the whole section: the site and the Content Studio share one origin
(`https://nandakumarm.dpdns.org`). The studio keeps a GitHub credential with repository write access in
`sessionStorage` (`admin/admin.js:23` `TOKEN_KEY = 'portfolio-studio-token'`, set at
`admin/admin.js:391`). There is **no `_headers` file and no CSP** anywhere in the repo. Therefore any
script that runs on the site origin can read that token and push to `main` — which re-triggers the
publish workflow. Any XSS here is a repo-takeover primitive, not a defacement.

### B1 — [High] [reproduced] JSON-LD `</script>` breakout in `create-blog-post.mjs`

`scripts/create-blog-post.mjs:107-118` builds `schema` with `JSON.stringify`, and `:149` embeds it
raw:

```js
const schema = JSON.stringify({ '@context': ..., headline: title, description: excerpt, ... });
...
  <script type="application/ld+json">${schema}</script>
```

`JSON.stringify` escapes `"` and `\` but **not `<`**, so a title containing `</script>` terminates the
element and everything after it becomes live markup. Every other use of `title` in the same template
is escaped (`:131`, `:141`, `:150`) — only the JSON-LD block is raw. Reproduced:

```bash
printf '%s' '{"title":"Pwn </script><script>alert(document.domain)</script>","slug":"ldjson-pwn",
"category":"Engineering","date":"2026-08-19","readTime":"6 min read","excerpt":"x",
"image":"ldjson-pwn.png","content":"<p>hi</p>"}' > p.json
node scripts/create-blog-post.mjs p.json
# → <script type="application/ld+json">{...,"headline":"Pwn </script><script>alert(document.domain)</script>",...}
```

`publish-content.mjs:183` then copies that file verbatim to `blog/<slug>.html`.

Fix: the repo already has the correct helper in the browser studio —
`admin/admin.js:1184-1186` `function jsonLd(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }`.
Extract one shared `escapeHtml`/`jsonLd` module for `scripts/` and use it here.

### B2 — [High] [reproduced] Unescaped `image` interpolated into HTML attributes

`scripts/create-blog-post.mjs:144,148,170`

```js
<meta property="og:image" content="https://nandakumarm.dpdns.org/assets/images/blog/${imageName}">
...
<img src="${imageSrc}" alt="${escapeHtml(values.alt || title)}" class="article-image">
```

`values.image` is a documented input (`:14`). The only validation applied to it (`:94-96`) compares
`slugify(basename(imageName, extname(imageName)))` to the slug; because `path.extname()` takes
everything after the *last* dot, a payload with no second dot passes the check untouched. Reproduced:

```bash
printf '%s' '{"title":"Injection test","slug":"injection-test","category":"Engineering",
"date":"2026-08-19","readTime":"6 min read","excerpt":"x",
"image":"injection-test.svg\" onerror=\"alert(1)","content":"<p>hi</p>"}' > p.json
node scripts/create-blog-post.mjs p.json   # exit 0
```

Output in `uploads/blog/injection-test.html:25,51`:

```html
<meta property="og:image" content=".../injection-test.svg" onerror="alert(1)">
<img src="../assets/images/blog/injection-test.svg" onerror="alert(1)" alt="Injection test" class="article-image">
```

The `<img ... onerror>` executes on the published article. Note that `imageFile` *is* validated against
an extension whitelist (`:89-91`); the `image` string is not.

Fix: validate `image` against `/^[a-z0-9-]+\.(jpg|jpeg|png|webp|gif|svg)$/i` and wrap every
interpolation in `escapeHtml`.


### B3 — [High] [analysis] Uploaded content becomes production HTML with no sanitization and no CSP

`scripts/publish-content.mjs:183` publishes the inbox file byte-for-byte:

```js
fs.copyFileSync(sourcePath, outputPath);
```

The publisher validates metadata (`requireMeta`, `isValidDate`) and the cover image, but never inspects
the HTML body, so `<script>`, `on*` handlers and `<iframe>` in `uploads/blog/*.html` or
`uploads/projects/*.html` are served as-is from the site origin. Combined with the missing CSP and the
`sessionStorage` token, the impact chain is: content in `uploads/` → arbitrary JS on the production
origin → read `portfolio-studio-token` → push to `main` → publish again.

Severity depends entirely on who can write to `uploads/`, which the repo does not state: for a
single-owner repo this is defence-in-depth, but the moment a contributor PR or a leaked token can
touch `uploads/`, it is a full takeover. Two cheap mitigations, in order of value:

1. Add a `_headers` file with a baseline CSP (`default-src 'self'`; `script-src 'self'`; no
   `unsafe-inline`). This also blunts B1/B2/B4/B5 — but it requires removing the remaining inline
   `<script>`/`<style>` blocks first (see F1/F2), so scope it deliberately.
2. Validate the upload body in `publish-content.mjs` (reject `<script`, `<iframe`, ` on\w+=`,
   `javascript:`) and document the `uploads/` trust model in `CONTENT_PUBLISHING.md`.

### B4 — [Medium-High] [analysis] The "edit published page" path bypasses `sanitizeContent()`

`admin/admin.js:873-874` and `:911`

```js
const page = await readRepoText(item.url);
values = parsePublishedPage(page.text, type, item);
...
el.richEditor.innerHTML = values.content;
```

`parsePublishedPage` (`admin.js:929-930`) takes `.article-content` `innerHTML` straight out of the
repository file, and `editPublished` assigns it to the live `contenteditable` with **no sanitization**
— unlike every other editor input path (`admin.js:1051`, `:1058`, `:1062` and `:1240` all call
`sanitizeContent`). `innerHTML` does not run `<script>`, but it does create and run
`<img src=x onerror=…>`, `<svg onload=…>`, etc. So publishing anything containing an event handler
(possible via B1/B2, via a hand-edited file, or via a contributor PR) executes in the admin origin the
next time the owner clicks "Edit", with the token present.

Fix: `el.richEditor.innerHTML = sanitizeContent(values.content);`.


### B5 — [Medium-High] [analysis] `formatDate()` returns raw input into two `innerHTML` sinks

`admin/admin.js:175-179`

```js
function formatDate(value, options = { ... }) {
  if (!value) return 'Not dated';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', options).format(date);
}
```

The fallback returns the caller's string verbatim. Neither call site escapes it, even though every
neighbouring field does — `admin.js:665` and `admin.js:717`:

```js
<small>${escapeHtml(item.category || 'Uncategorized')} · ${formatDate(item.date)}</small>
<time class="content-date">${formatDate(item.date)}</time>
```

Both are assigned via `innerHTML` (`admin.js:662`, `:710`), and `item.date` comes from
`assets/data/blog.json` / `works.json` (`normalizeContent`, `admin.js:601-617`, copies it untouched).
A non-date value such as `<img src=x onerror=…>` therefore becomes live markup in the studio
dashboard — the one place in the studio where a repo-controlled field is not escaped
(`admin.js:1262` correctly does `escapeHtml(formatDate(values.date))`).

Fix: `return Number.isNaN(date.getTime()) ? 'Not dated' : ...`.

### B6 — [Medium] [analysis] `sanitizeContent()` is weaker than it looks

`admin/admin.js:223-234` removes `script, iframe, object, embed, form, input, button, textarea, select, link, meta`
and strips attributes whose name starts with `on` or whose value starts with `javascript:` (after
`trim().toLowerCase()`). Gaps:

- `<style>` elements survive, so published content can restyle or hide parts of the site;
- URL checks use `startsWith('javascript:')`, which does not catch internal whitespace/control
  characters (`java\tscript:alert(1)`) or other executable schemes (`data:text/html,...`);
- attribute-name checks only look for the `on` prefix, so `formaction`, `srcdoc` and namespaced
  handlers (`xlink:href`) are not considered.

It is also only used on the write path, never when rendering (see B4). Since the site has no CSP, this
is the only barrier — worth hardening and unit-testing.

### B7 — [Low] [analysis] `escapeHtml` is not a URL-scheme filter

`scripts/render-static-content.mjs:64` and `assets/js/main.js:59` put repo-JSON URLs into `href` after
`escapeHtml`, which escapes quotes but passes `javascript:`/`data:` schemes through. Any `url`,
`github` or `demo` value in `works.json`/`github-projects.json` therefore becomes a live link on the
public site. Low likelihood (the data is generated from the GitHub API plus a curated file), but a
one-line allowlist removes the class entirely.

### B8 — [Medium] [analysis] Two deployment models are declared; one of them would break OAuth

- `functions/api/github/oauth/*.js` + `_redirects` + `CNAME` + `.assetsignore` are Cloudflare
  **Pages** conventions (Pages auto-routes `functions/`).
- `wrangler.jsonc` describes a **Workers** project (`"name": "portfolio"`, `assets.directory: "."`)
  with **no `main`**, i.e. a static-assets-only Worker. Workers static assets do not route
  `functions/`, and `.assetsignore` explicitly excludes `functions`, `scripts`, `templates`,
  `uploads`, `docs`, `wrangler.jsonc`, `README.md` and `LICENSE` from the bundle.

If the project is ever deployed with `wrangler deploy`, `/api/github/oauth/start` and
`/api/github/oauth/callback` will 404 and the documented "Continue with GitHub" login
(`docs/content-studio-oauth.md`) silently falls back to the PAT path. Worth confirming which model is
live and deleting the other; if Pages is the target, `wrangler.jsonc` is misleading.

Everything checkable *inside* the OAuth handlers is sound: `state` + PKCE S256 (`start.js:48-58`),
`HttpOnly; Secure; SameSite=Lax` cookies with a 600 s lifetime (`start.js:25-27`), state comparison
before the code exchange (`callback.js:81-83`), server-side ownership and write-access checks
(`callback.js:113-118`), no client secret in the browser (`admin/config.js`), `postMessage` to an
explicit `targetOrigin` with `<`-escaped JSON (`callback.js:23-43`), and a locked-down popup CSP
(`callback.js:51`).


---

## C. Accessibility & progressive enhancement

### C1 — [High] [reproduced] The site is blank without JavaScript

`assets/css/reveal.css:13-23`

```css
[data-reveal] { opacity: 0; transform: translate3d(...) scale(...); }
```

The only places that restore visibility are `reveal.js:34,47-58` (JS adds `.is-revealed`) and
`assets/css/polish.css:102`, which does so **only inside `@media (prefers-reduced-motion: reduce)`**.
With JS blocked, broken or still loading, everything marked `data-reveal` stays at `opacity: 0` — and
that is most of the page: `index.html` 18 elements, `projects.html` 36, `about.html` 15,
`blog.html` 12, `contact.html` 3, including the hero, all project cards and all article cards
(the generated cards carry `data-reveal="up"` — `render-static-content.mjs:55`, `:77`, `:89`).

`blog.html:58` even ships a `<noscript>` reading "All articles are listed on this page" while those
very cards are invisible, and the older articles that have no `data-reveal` at all look different —
so this is drift, not design.

Fix: gate the hidden state on JS being present, e.g. add `document.documentElement.classList.add('js')`
before first paint and scope the rule to `html.js [data-reveal]`, or add
`<noscript><style>[data-reveal]{opacity:1;transform:none}</style></noscript>`.

### C2 — [Low] [reproduced] Base styling is applied by JavaScript

`assets/js/theme.js:16-21` creates and appends the `polish.css` `<link>` at runtime:

```js
stylesheet.href = new URL("../css/polish.css", document.currentScript?.src || window.location.href).href;
```

So a stylesheet is a JS dependency: it costs an extra round trip after JS parses, produces a flash of
unpolished content, and never loads with JS off. It should be a plain `<link>` in each page's `<head>`
(pages already include `theme.css`/`animations.css`/`main.css` that way).

### C3 — [Low] [reproduced] `robots.txt` blocks the assets the pages need

`robots.txt:4` → `Disallow: /assets/`. That blocks crawling of the CSS and JS under `/assets/`, which
is precisely what a renderer needs in order to see the (JS-dependent) content of C1/C2. `Disallow` is
about crawling, not indexing, so the site is only hurting its own rendered snapshot.

### C5 — [Low] [analysis] The contact form's no-JS behaviour contradicts its own copy

`contact.html:41` tells the visitor "It does not send or store your information on the website", and
`main.js:250-266` intercepts submit and builds a `mailto:` (with `encodeURIComponent`, so no header
injection — that part is correct). But the `<form>` has no `method`/`action`, so with JS disabled the
browser performs a real **GET submit back to the page**, putting name/email/message into the URL and
into server/proxy logs. `method="post"` (or a `disabled`-until-JS submit button) would keep the claim
true.

---

## D. SEO & metadata

### D1 — [Medium] [reproduced] Article and project pages are stale output of an older template

`grep` across `blog/*.html` and `works/*.html`:

| page set | canonical | `og:*` | JSON-LD |
|---|---|---|---|
| `blog/*.html` (10) | 0 / 10 | 0 / 10 | 0 / 10 |
| `works/*.html` (6) | 0 / 6 | 1 / 6 (`archive-tool-suite.html`) | 0 / 6 |

Meanwhile the current generator emits all of it — `scripts/create-blog-post.mjs:139-149` writes
`rel="canonical"`, `og:type/title/description/url/image`, `twitter:*` and a `BlogPosting` JSON-LD
block — and the top-level pages already carry JSON-LD (`index.html`, `about.html:536`). So the
article/project pages are simply older than the template that produces them: shared links get no
preview card, there is no canonical signal, and no Article rich-result eligibility.

Fix: regenerate the affected files with the current generator (or add the missing head tags), and add
a check to `tools/audit_links.py` that every page under `blog/` and `works/` has a canonical.


---

## E. Performance

### E1 — [Medium] [reproduced] One 4.3 MB PNG is the main visual payload

`assets/images/archive-engineering-hero.png` is 4.3 MB (~68 % of the 6.4 MB `assets/images` tree);
`assets/files/resume.pdf` adds 1.9 MB. The PNG is used as a card thumbnail (`index.html:156`,
`blog.html:61` — lazy, but still the full-resolution file), as the article hero
(`blog/honest-software-boundaries.html:45` — no `width`/`height`, no `fetchpriority`), and as the
`og:image` for `projects.html:14` and `works/archive-tool-suite.html:14`, where a social preview should
be small.

Fix: resize/re-encode it (a 1600×900 WebP/AVIF lands near 100–200 KB), keep a small `og:image`, and add
explicit `width`/`height` to card and hero images to avoid layout shift. Note
`works/archive-tool-suite.html:54` already does this correctly (`width="1600" height="900"
fetchpriority="high"`) while the blog article does not.

---

## F. Structure & style

### F1 — [Medium] [reproduced] No templating: the shell is copy-pasted 22 times

Every page repeats the same `<header class="site-header glass">` / nav / theme-toggle / footer markup
by hand (22 pages; `templates/` holds upload templates for the studio, not the site shell), so a single
nav change is a 22-file edit — and the copies have already drifted:

- All 16 `blog/*.html` and `works/*.html` pages use an older shell: nav label "Blog" instead of
  "Articles" and **no Contact link at all** (`blog/honest-software-boundaries.html:35`), whereas
  `index.html:45` / `about.html` / `contact.html` carry the Contact link. The generator still emits the
  old shell (`scripts/create-blog-post.mjs:161`), so every newly published article reintroduces it.
- The brand tagline reads "Electrical &amp; Electronics Design Engineer" in 13 pages but
  "Electrical Design · Practical Software" in `index.html:43` and `contact.html:30`.

A shared include step in `render-static-content.mjs` would fix this permanently.

### F2 — [Medium] [reproduced] Large inline `<style>` blocks

`about.html:31-535` is a 505-line inline stylesheet (`.page-hero`, `.content-grid`, `.feature-grid`,
`.quick-stats`, …) duplicating rules that live in `assets/css/main.css` and `content-pages.css`;
`blog.html:26-33` has a second inline block. This blocks any meaningful CSP (see B3) and makes the
cascade hard to reason about. `index.html`, `contact.html` and `projects.html` have none — the
convention is inconsistent.

### F3 — [Low] [reproduced] Four copies of `escapeHtml`, and the JSON-LD helper is not shared

`escapeHtml` exists in `assets/js/main.js:24-30`, `admin/admin.js:152-159`,
`scripts/render-static-content.mjs:17-24` and `scripts/create-blog-post.mjs:51-56` (plus `decodeHtml` in
`publish-content.mjs:30-38`), and `projects.js:7` reaches across to `window.portfolioEscapeHtml`.
`admin/admin.js:1184` already has the correct `jsonLd()` helper, but
`scripts/create-blog-post.mjs` does not reuse it — which is exactly how B1 happened. One shared
`escapeHtml` + `jsonLd` module imported by all four files, plus a regression test asserting generated
HTML contains no raw `</script>` or ` on\w+=` attribute, prevents the whole class.

### F4 — [Low] [reproduced] Minor consistency issues

- `assets/js/main.js:67-70` exports `projectCard`, `loadJson`, `escapeHtml`, `formatProjectDate` on
  `window` so `projects.js` can use them (`projects.js:7`), while `blog.js` relies on `blogCard`
  (`main.js:72`) being an implicit global — two different coupling styles for the same problem.
- Absolute vs relative asset paths are mixed: `/assets/css/reveal.css` in the generated `blog/`/`works/`
  pages and the stub pages, `../assets/...` and `assets/...` elsewhere.
- `_redirects` covers `/projects`, `/blog`, `/about`, `/home` but not `/resume`, `/works` or
  `/contact`, although `resume.html`/`works.html` exist as stubs — the extensionless-URL story is
  half-finished.

---

## G. Verified as correct (checked, no issue found)

- **No XSS from the public site's own data path.** Every `innerHTML`/`insertAdjacentHTML` sink in
  `assets/js/main.js`, `blog.js`, `projects.js`, `theme.js`, `reveal.js` and
  `scripts/render-static-content.mjs` escapes untrusted fields before writing markup: `main.js:24-30`
  defines `escapeHtml` and `main.js:42-70` / `:72-88` (the shared `blogCard`, also used by `blog.js`)
  / `:167` / `:178` apply it; `projects.js:7` aliases it and `:11-22` applies it to every field;
  `render-static-content.mjs:17-24` defines its own and `:52-97` uses it for every card field. Both
  implementations escape `&` first, so `&amp;lt;` cannot double-decode.
- **No XSS from URL parameters.** The public JS never reads `location.search`; nothing uses
  `document.write`, `eval`, `new Function` or `outerHTML`.
- **No command execution anywhere.** No `child_process`, `exec`, `spawn` in `scripts/`, `tools/`,
  `admin/` or `functions/`.
- **No workflow injection.** The only `${{ }}` interpolation reaching a shell is
  `${{ secrets.GITHUB_TOKEN }}` (`sync-public-projects.yml:21`); no `github.event.*` or matrix values
  reach `run:`. `publish-content.yml:26` (`github.actor != 'github-actions[bot]'`) plus `[skip ci]`
  correctly prevent a publish loop, and the `concurrency` group with `cancel-in-progress: false`
  serialises publisher runs.
- **`target="_blank"` is always paired with `rel="noopener noreferrer"`** — every occurrence across all
  27 pages and in the generated markup.
- **Duplicate IDs: none** (confirmed by the repo audit and an independent scan). No page is missing a
  title or meta description, and all local `href`/`src` targets resolve to real files.
- **Contact form input handling** — `main.js:252-266` prevents the default submit and
  `encodeURIComponent`s both subject and body, so there is no CRLF/header or HTML injection into the
  `mailto:` (the no-JS issue is C5).
- **OAuth handlers** — see the last paragraph of B8: state + PKCE + cookie flags + origin-pinned
  `postMessage` + popup CSP are all correct, and the client secret never reaches the browser.
- **Publisher validation is otherwise sound** — `isValidDate` (`publish-content.mjs:85-87`) rejects
  impossible dates, `Intl.DateTimeFormat` is used with `timeZone: 'UTC'` to avoid the off-by-one-day
  bug, slug normalisation is `[a-z0-9-]`-only and truncated at 80 chars, image extensions are
  whitelisted and must match the slug, repo paths are percent-encoded per segment
  (`admin.js:333-335`), and indexes are written with a stable sort and `JSON.stringify(..., 2) + '\n'`.
- **`sync-github-projects.mjs` fails safe** — public/non-fork/non-archived filter (`:118`), the whole
  snapshot is read before a single `fs.writeFileSync` (`:117-152`), README fetch tolerates 404, and the
  token comes from `process.env.GITHUB_TOKEN` and is never written to disk or logged.
- **`render-static-content.mjs` is idempotent** — regenerating on a clean checkout produced
  byte-identical `index.html`, `projects.html`, `blog.html` and `sitemap.xml` (verified with `diff`).
- **`.assetsignore` excludes `uploads`**, so staged-but-unvalidated uploads are not served before
  publication.

---

## H. Suggested fix order

1. **A1** — one-line fix; content publishing is broken today.
2. **C1** — one-line CSS/`<noscript>` fix; the site is unusable without JS today.
3. **B1 + B2 + F3** — share one `escapeHtml`/`jsonLd` helper across `scripts/` and add a generator
   regression test.
4. **B4 + B5** — apply `sanitizeContent`/`escapeHtml` on the two unescaped read paths.
5. **D1 + A4** — regenerate the article/project pages with the current template.
6. **B3 + F2** — add `_headers` with a CSP (after de-inlining) and validate upload bodies.
7. **A2 + A5 + C3** — resume anchor, sitemap contents, `robots.txt`.
8. **E1, B6, B7, B8, F1, F4** — optimisation, hardening and consolidation.

