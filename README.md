# Nandakumar M Portfolio

## Overview

This repository contains the static portfolio website for **Nandakumar M**, an Electrical and Electronics Design Engineer. The public site uses HTML, CSS, and browser-native JavaScript so it can be served directly as static assets. Repository automation and a GitHub-backed Content Studio add structured authoring, validation, and publishing without introducing a client-side framework or application build step.

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

## Prerequisites

- A modern web browser for the public site and Content Studio.
- Python 3 for local preview and the static HTML audit.
- Node.js 22 or a compatible current Node.js release for content-generation and publishing scripts. The workflow currently pins Node.js 22.
- Git only when cloning, committing, or using the manual publication workflow.

The repository has no package manifest and no third-party dependencies to install.

## Installation

```bash
git clone https://github.com/nandurpm/portfolio.git
cd portfolio
```

No `npm install` step is required.

## Running Locally

Pages load JSON indexes and local assets, so serve the repository through HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>. To explore the Content Studio without GitHub requests, open <http://localhost:8000/admin/?demo=1>.

## Configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| Public domain | `CNAME` and canonical metadata | Defines the portfolio hostname used by the static pages. |
| Static redirects | `_redirects` | Maps extensionless public routes to their HTML files. |
| Cloudflare project settings | `wrangler.jsonc` | Serves the repository root as static assets and enables Pages Functions compatibility. |
| Public studio defaults | `admin/config.js` | Selects the GitHub owner, repository, branch, site URL, and optional public OAuth client ID. |
| OAuth runtime values | Deployment environment | Supplies `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SITE_ORIGIN`, `GITHUB_OWNER`, and `GITHUB_REPOSITORY` to the server-side handlers. |

Only the OAuth client ID is safe to expose in browser configuration. Keep the client secret, access tokens, and production-only values in the deployment environment. See [`docs/content-studio-oauth.md`](docs/content-studio-oauth.md) for the exact setup.

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

## Content Management

For direct maintenance, edit the JSON indexes and published HTML pages according to the guidance in `assets/data/`, `blog/`, and `works/`. For the automated flow, use the templates in `templates/`, upload complete HTML/image pairs to `uploads/blog/` or `uploads/projects/`, and allow `.github/workflows/publish-content.yml` to validate and publish them. The detailed process is documented in `CONTENT_PUBLISHING.md`.

The Content Studio is served from `/admin/`. Its browser-side configuration may contain a public OAuth client ID, but OAuth client secrets and access tokens must never be committed. See [`admin/README.md`](admin/README.md) and [`docs/content-studio-oauth.md`](docs/content-studio-oauth.md).

## Build and Generated Content

The public site does not require compilation. The closest equivalent to a build step is regenerating the static project and blog card blocks from the JSON indexes:

```bash
node scripts/render-static-content.mjs
```

The upload publisher is normally run by GitHub Actions. It can also be executed locally when complete upload pairs are staged:

```bash
node scripts/publish-content.mjs
node scripts/render-static-content.mjs
```

`publish-content.mjs` moves validated uploads into the published folders and updates JSON indexes. Review its resulting diff before committing.

## Validation

Run the repository’s deterministic checks from the repository root:

```bash
python3 tools/audit_links.py
for file in $(find . -type f \( -name '*.js' -o -name '*.mjs' \)); do node --check "$file"; done
git diff --check
```

The Python audit checks local HTML references, duplicate IDs, page titles, and meta descriptions. There is no unit-test suite or package-level lint command in the current repository. When changing content, also preview affected pages through the local server and inspect generated JSON/index changes before committing.

## Deployment

The repository includes a `CNAME` file for the custom domain, `_redirects` for route compatibility, and `wrangler.jsonc` for Cloudflare asset deployment. The content publishing workflow runs on pushes that change `uploads/blog/**` or `uploads/projects/**`, validates the staged content, renders static cards, and commits generated website files. Confirm the active deployment settings in the hosting provider before changing deployment configuration.

## Important Files

| File | Purpose |
| --- | --- |
| `index.html` | Main portfolio landing page |
| `about.html` | Professional profile, current work, technical stack, experience, process, and contact call to action |
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
| [`CONTENT_PUBLISHING.md`](CONTENT_PUBLISHING.md) | End-to-end content publishing process |
| [`admin/README.md`](admin/README.md) | Content Studio authentication and operation |
| [`uploads/README.md`](uploads/README.md) | Upload inbox format and staging rules |
| [`docs/content-studio-oauth.md`](docs/content-studio-oauth.md) | OAuth integration notes |
| [`docs/BLOG_AUTOMATION.md`](docs/BLOG_AUTOMATION.md) | Command-line blog staging and generated-card workflow |
| [`.github/README.md`](.github/README.md) | Repository automation, permissions, and workflow boundaries |
| [`tools/README.md`](tools/README.md) | Validation utility guidance |
| Folder `README.md` files | Directory-specific responsibilities and conventions |

## Contributing

Keep changes scoped and reviewable. Preserve public routes, JSON field names, upload metadata names, and the marker comments consumed by `render-static-content.mjs`. Run the validation commands above, inspect generated files, and update the relevant folder documentation whenever responsibilities or workflows change.

## Security

Never commit OAuth client secrets, personal access tokens, session credentials, private keys, or production-only environment values. The browser editor may temporarily hold credentials in session storage, but that does not make them safe to place in source files. Review `.gitignore` and deployment secrets before publishing changes.

## License

This project is available under the MIT License. See `LICENSE`.
