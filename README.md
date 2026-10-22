# Nandakumar M — Portfolio

A fast, responsive portfolio for **Nandakumar M**, an Electrical and Electronics Design Engineer in Chennai, Tamil Nadu. The site brings together professional background, selected engineering/software work, a public-only GitHub project catalog, technical articles, résumé, and direct contact information.

**Live site:** <https://nandakumarm.dpdns.org>

**GitHub profile:** <https://github.com/nandurpm>

## Highlights

- Focused landing page built around electrical systems, documentation, and practical software
- Eight curated project case cards with purpose, stack, repository, and demo links
- Searchable/filterable catalog generated from public GitHub repositories
- Private repositories, forks, and archived repositories excluded before publication
- Ten first-party articles with category filtering, search, and pagination
- Detailed About page with verified work, education, skills, and location
- Dedicated Contact page that prepares email locally without storing form data
- Dark/light themes, responsive layouts, structured metadata, Open Graph tags, and sitemap
- Static architecture with no client framework and no runtime dependency installation

## Visual theme

The public portfolio uses an original cinematic theme inspired by [Portfolio_series](https://github.com/Sushmitadasari/Portfolio_series): charcoal surfaces, crimson accents, a portrait billboard, episodic section labels, and a native swipe rail for selected projects. Existing system/saved light and dark preferences, keyboard navigation, reduced-motion support, content, and static hosting remain supported. No reference code, photos, or branding were copied.

Shared overrides live in `assets/css/series.css`; `scripts/site-pages.mjs` adds them to every public page during content publishing. The embedded tracker and Content Studio keep their own styles.

## Stack

| Area | Implementation |
| --- | --- |
| Front end | Semantic HTML5, CSS3, vanilla JavaScript |
| Content | JSON indexes plus static HTML article/project pages |
| Repository sync | Node.js script using the public GitHub REST API |
| Content publishing | Node.js scripts and GitHub Actions |
| Hosting | Cloudflare-compatible static assets, custom domain, redirects |
| Validation | Node syntax checks and a Python HTML/link audit |

## Run locally

No package installation or build step is required.

```bash
git clone https://github.com/nandurpm/portfolio.git
cd portfolio
python3 -m http.server 8000
```

Open <http://localhost:8000>. Use an HTTP server instead of opening the HTML files directly because pages load JSON data with `fetch()`.

## Refresh public project data

The sync script retrieves repositories owned by `nandurpm`, keeps only records where GitHub reports public visibility, and removes forks and archived repositories. It also retrieves README summaries for the curated projects.

```bash
node scripts/sync-github-projects.mjs
node scripts/render-static-content.mjs
```

For higher GitHub API limits, provide the standard `GITHUB_TOKEN` environment variable. Never commit a token.

Generated project data lives in:

- `assets/data/works.json` — editorial selection of eight featured projects
- `assets/data/github-projects.json` — generated public-only repository snapshot

The project page remains useful without JavaScript because the render script writes static card markup into the HTML. JavaScript adds live filtering and sorting.

## Publish an article

The existing first-party blog is intentionally kept in the repository—no external publishing platform is required.

```bash
node scripts/create-blog-post.mjs
node scripts/render-static-content.mjs
```

For the upload-based workflow, see [`CONTENT_PUBLISHING.md`](CONTENT_PUBLISHING.md). The browser Content Studio is under `admin/`; OAuth setup is documented in [`docs/content-studio-oauth.md`](docs/content-studio-oauth.md).

## Validate changes

```bash
node scripts/render-static-content.mjs
python3 tools/audit_links.py
for file in $(find assets/js admin functions scripts -type f \( -name '*.js' -o -name '*.mjs' \)); do node --check "$file"; done
git diff --check
```

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html` | Portfolio landing page |
| `about.html` | Background, education, experience, skills, and working approach |
| `projects.html` | Featured work and public repository explorer |
| `blog.html`, `blog/` | Article index and published articles |
| `contact.html` | Direct contact page and local mail composer |
| `assets/data/` | Project and article metadata |
| `assets/css/`, `assets/js/` | Shared design system and interactions |
| `scripts/` | GitHub sync, static rendering, and content publishing |
| `tools/audit_links.py` | Local reference, metadata, and duplicate-ID checks |
| `.github/workflows/` | Content and public-project automation |

## Privacy and security

The public catalog is generated exclusively from GitHub’s public repository response. Do not manually add private project names, links, README text, screenshots, credentials, customer data, proprietary register maps, or internal engineering details to public portfolio files.

The contact form does not submit to a backend; it prepares a `mailto:` link on the visitor’s device. OAuth client secrets, GitHub tokens, and deployment secrets must remain in the hosting or Actions environment.

## Deployment

The repository includes `CNAME`, `_redirects`, and `wrangler.jsonc` for the existing static deployment. Pushes to the configured production branch are deployed by the connected hosting provider. The weekly GitHub workflow refreshes only the public repository snapshot and generated cards.

## License

MIT — see [`LICENSE`](LICENSE).

## Audit regression checks

After `npm ci --ignore-scripts` in `tools/tracker-source`, run `node tools/test-portfolio.cjs` from the repository root. It uses the pinned Playwright dependency and `/usr/bin/chromium` (or `CHROMIUM_PATH`). The checks cover mobile layouts, no-JavaScript content, failed reveal loading, denied theme storage, static filtering and pagination, malicious editor HTML, and locally applied CSP/cache rules. They do not prove Cloudflare deployment behavior. See `docs/AUDIT_RESOLUTION.md` for findings and outstanding hosting checks.

`node scripts/render-static-content.mjs` also normalizes published page metadata and shared styles and regenerates CSP script hashes in `_headers`. Commit `_headers` and `sitemap.xml` together with generated pages. Self-hosted fonts use optional display to avoid late font swaps; system fallback fonts may be used on a slow first visit. `CNAME` is retained for compatibility; the renderer uses the site URL in `scripts/site-pages.mjs`.
