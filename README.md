# Nandakumar M Portfolio

This repository contains the static portfolio website for **Nandakumar M**, a designing and development engineer. It is intentionally implemented with HTML, CSS, and browser-native JavaScript so the public site can be deployed as static assets while still supporting interactive themes, content indexes, publishing automation, and a protected GitHub-backed Content Studio.

## Live Site

The production site is available at <https://nandakumarm.dpdns.org>. The repository is hosted at <https://github.com/nandurpm/portfolio>.

## What This Project Does

The site presents professional background information, engineering and software projects, technical writing, downloadable resume material, and contact information. Projects and articles are represented as static HTML pages and JSON indexes. A browser-based Content Studio can stage new content, while GitHub Actions validates uploads, publishes pages, and regenerates the public indexes.

## Features

The public experience includes responsive layouts, dark/light theme persistence, scroll-reveal animation, project filtering, blog search/filtering/pagination, SEO and social metadata, project detail pages, a resume download, legacy route redirects, and an annual Independence Day visual edition that activates on the user’s local 15 August date. The repository also contains Cloudflare-compatible configuration and a server-side GitHub OAuth route for the Content Studio.

## Technology Stack

| Area | Implementation |
| --- | --- |
| Public site | Static HTML5, CSS3, and vanilla JavaScript |
| Content indexes | JSON files under `assets/data/` |
| Publishing automation | Node.js scripts under `scripts/` and GitHub Actions |
| Content authoring | HTML templates under `templates/` and Content Studio under `admin/` |
| Server-side integration | Cloudflare Pages Function for GitHub OAuth |
| Deployment configuration | `CNAME`, `_redirects`, and `wrangler.jsonc` |
| Validation | `tools/audit_links.py` |

## Repository Structure

| Path | Responsibility |
| --- | --- |
| `*.html` | Public entry pages and redirects at the site root |
| `assets/` | Shared CSS, JavaScript, data indexes, files, and images |
| `blog/` | Published article pages |
| `works/` | Published project pages |
| `admin/` | Browser-based Content Studio |
| `uploads/` | Incoming blog/project content waiting for publication |
| `scripts/` | Upload validation and static content generation |
| `templates/` | New article and project authoring templates |
| `tools/` | Read-only link and metadata checks |
| `functions/` | Deployed server-side API routes |
| `docs/` | Architecture and operational notes |
| `.github/workflows/` | Automated content publication workflow |

Each meaningful directory has its own `README.md`. Those files describe the directory’s actual responsibility, important contents, and boundaries.

## Local Preview

This is a static site, but pages load JSON indexes and local assets. Serve the repository through an HTTP server rather than opening `index.html` directly.

```bash
python -m http.server 8000
```

Open <http://localhost:8000> after the server starts.

## Content Management

For direct maintenance, edit the JSON indexes and published HTML pages according to the guidance in `assets/data/`, `blog/`, and `works/`. For the automated flow, use the templates in `templates/`, upload complete HTML/image pairs to `uploads/blog/` or `uploads/projects/`, and allow `.github/workflows/publish-content.yml` to validate and publish them. The detailed process is documented in `CONTENT_PUBLISHING.md`.

The Content Studio is served from `/admin/`. Its browser-side configuration may contain a public OAuth client ID, but OAuth client secrets and access tokens must never be committed. See `admin/README.md` and `docs/content-studio-oauth.md`.

## Validation

Run the repository’s deterministic static audit from the repository root:

```bash
python3 tools/audit_links.py
```

The audit checks local HTML references, duplicate IDs, page titles, and meta descriptions. When changing content, also preview affected pages through the local server and inspect the generated JSON/index changes before committing.

## Deployment

The repository includes a `CNAME` file for the custom domain, `_redirects` for route compatibility, and `wrangler.jsonc` for Cloudflare asset deployment. The content publishing workflow runs on pushes that change `uploads/blog/**` or `uploads/projects/**`, validates the staged content, renders static cards, and commits generated website files. Confirm the active deployment settings in the hosting provider before changing deployment configuration.

## Important Files

| File | Purpose |
| --- | --- |
| `index.html` | Main portfolio landing page |
| `about.html` | About, presentation, resume, and contact sections |
| `projects.html` | Project index and filtering interface |
| `blog.html` | Blog index and search/filter interface |
| `assets/js/main.js` | Shared page initialization and interaction behavior |
| `assets/js/theme.js` | Theme selection, persistence, and local-date Independence Day activation |
| `assets/css/independence-day.css` | Isolated tricolour event palette, responsive banner, and reduced-motion-safe annual theme styles |
| `assets/data/works.json` | Project metadata consumed by the project interface |
| `assets/data/blog.json` | Blog metadata consumed by the blog interface |
| `scripts/publish-content.mjs` | Validates and publishes staged content |
| `scripts/render-static-content.mjs` | Regenerates static content cards/indexes |
| `tools/audit_links.py` | Static link and metadata audit |
| `.github/workflows/publish-content.yml` | Automated upload publication pipeline |

## Documentation Map

| Documentation | Scope |
| --- | --- |
| `CONTENT_PUBLISHING.md` | End-to-end content publishing process |
| `admin/README.md` | Content Studio authentication and operation |
| `uploads/README.md` | Upload inbox format and staging rules |
| `docs/content-studio-oauth.md` | OAuth integration notes |
| `tools/README.md` | Validation utility guidance |
| `.github/README.md` | Automated publishing configuration and security boundary |
| `.github/workflows/README.md` | Static-content publishing workflow stages |
| Folder `README.md` files | Directory-specific responsibilities and conventions |

## Security

Never commit OAuth client secrets, personal access tokens, session credentials, private keys, or production-only environment values. The browser editor may temporarily hold credentials in session storage, but that does not make them safe to place in source files. Review `.gitignore` and deployment secrets before publishing changes.

## License

This project is available under the MIT License. See `LICENSE`.
