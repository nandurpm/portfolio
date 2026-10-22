/*
 * FILE: render-static-content.mjs
 * FILE PURPOSE: Regenerates static project/article cards and the sitemap from JSON indexes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { SITE_URL, normalizePage } from './site-pages.mjs';

const ROOT = process.cwd();

function readJson(relativePath) {
  const value = JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  if (!Array.isArray(value)) throw new Error(`${relativePath} must contain a JSON array.`);
  return value;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function replaceBlock(relativePath, startName, endName, markup) {
  const fullPath = path.join(ROOT, relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const start = `<!-- ${startName} -->`;
  const end = `<!-- ${endName} -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`${relativePath} is missing ${startName}/${endName} markers.`);
  }
  const cleanMarkup = markup.trim().replace(/[ \t]+$/gm, '');
  const replacement = `${start}\n${cleanMarkup}\n          ${end}`;
  fs.writeFileSync(fullPath, source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length));
}

function externalAttributes(url = '') {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function formatDate(value) {
  if (!value) return 'Recently updated';
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function projectCard(project) {
  const tags = (project.technologies || []).slice(0, 4)
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('');
  const details = project.url || project.github;
  const searchText = [project.title, project.category, project.description, project.outcome, ...(project.technologies || [])].join(' ').toLowerCase();
  return `          <article class="project-card project-dossier" data-reveal="up" data-category="${escapeHtml(project.category)}" data-search="${escapeHtml(searchText)}" data-name="${escapeHtml(project.title)}" data-stars="${Number(project.stars || 0)}" data-updated="${escapeHtml(project.updated || '')}">
            <div class="project-cover" aria-hidden="true"><span class="project-code">${String(project.rank || '').padStart(2, '0')}</span><span>${escapeHtml(project.category)}</span><strong>${escapeHtml(project.language || 'Project')}</strong></div>
            <div class="card-body">
              <div class="card-meta">${tags}</div>
              <h3>${escapeHtml(project.title)}</h3>
              <p>${escapeHtml(project.description)}</p>
              <p class="project-outcome"><strong>Built for:</strong> ${escapeHtml(project.outcome || 'A focused, practical workflow.')}</p>
              <div class="project-facts"><span>★ ${Number(project.stars || 0)}</span><span>${escapeHtml(formatDate(project.updated))}</span></div>
              <div class="card-actions">
                ${details && details !== project.github && details !== project.demo ? `<a href="${escapeHtml(details)}"${externalAttributes(details)}>Details <span aria-hidden="true">↗</span></a>` : ''}
                ${project.github ? `<a href="${escapeHtml(project.github)}" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>` : ''}
                ${project.demo ? `<a href="${escapeHtml(project.demo)}" target="_blank" rel="noopener noreferrer">Live demo <span aria-hidden="true">↗</span></a>` : ''}
              </div>
            </div>
          </article>`;
}

function repositoryCard(repository) {
  const tags = [repository.language, ...(repository.topics || [])].filter(Boolean).slice(0, 4)
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('');
  const description = repository.description || repository.readmeSummary || 'Open-source project and development notes.';
  const searchText = [repository.title, repository.name, repository.category, description, repository.language, ...(repository.topics || [])].join(' ').toLowerCase();
  return `          <article class="repository-card" data-reveal="up" data-category="${escapeHtml(repository.category)}" data-search="${escapeHtml(searchText)}" data-name="${escapeHtml(repository.title)}" data-stars="${Number(repository.stars || 0)}" data-updated="${escapeHtml(repository.updatedAt || '')}">
            <div class="repository-card-top"><span class="repo-icon" aria-hidden="true">⌁</span><span>${escapeHtml(repository.category)}</span></div>
            <h3>${escapeHtml(repository.title)}</h3>
            <p>${escapeHtml(description)}</p>
            <div class="card-meta">${tags}</div>
            <div class="repository-footer"><span>★ ${Number(repository.stars || 0)} · Updated ${escapeHtml(formatDate(repository.updatedAt))}</span><span class="card-actions"><a href="${escapeHtml(repository.github)}" target="_blank" rel="noopener noreferrer">Repository ↗</a>${repository.demo ? `<a href="${escapeHtml(repository.demo)}" target="_blank" rel="noopener noreferrer">Demo ↗</a>` : ''}</span></div>
          </article>`;
}

function blogCard(post, heading = 'h3') {
  const url = escapeHtml(post.url);
  const searchText = [post.title, post.excerpt, post.category, ...(post.tags || [])].join(' ').toLowerCase();
  return `          <article class="blog-card" data-reveal="up" id="post-${escapeHtml(post.slug)}" data-category="${escapeHtml(post.category)}" data-search="${escapeHtml(searchText)}">
            <img src="${escapeHtml(post.thumbnail || post.image)}" alt="${escapeHtml(post.title)}" width="${post.imageWidth || 800}" height="${post.imageHeight || 450}" loading="lazy">
            <div class="card-body">
              <div class="card-meta"><span class="pill">${escapeHtml(post.category)}</span><span class="pill">${escapeHtml(post.readTime)}</span></div>
              <${heading}><a class="blog-card-link" href="${url}">${escapeHtml(post.title)}</a></${heading}>
              <p>${escapeHtml(post.excerpt)}</p>
              <div class="card-actions"><span aria-hidden="true">Read article ↗</span><span>${escapeHtml(post.date)}</span></div>
            </div>
          </article>`;
}

function listPublishedHtml(directory) {
  return fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => `${directory}/${entry.name}`);
}

function renderSitemap(projects, posts) {
  const siteUrl = SITE_URL;
  const topLevelPages = ['', 'about.html', 'projects.html', 'blog.html', 'contact.html', 'savings-tracker.html', 'savings-tracker-privacy.html'];
  const indexedContent = [...projects.map((project) => project.url), ...posts.map((post) => post.url)]
    .filter((url) => typeof url === 'string' && !/^[a-z]+:\/\//i.test(url))
    .map((url) => url.split('#')[0].split('?')[0]);
  const paths = [...new Set([...topLevelPages, ...indexedContent, ...listPublishedHtml('works'), ...listPublishedHtml('blog')])]
    .filter((relativePath) => !/^(?:resume|works|diploma-notes)\.html$/.test(relativePath));
  const postDates = new Map(posts.map((post) => [post.url, post.date]));
  const urls = paths.map((relativePath) => {
    const loc = relativePath ? `${siteUrl}/${relativePath}` : `${siteUrl}/`;
    let lastModified = postDates.get(relativePath);
    if (!lastModified) {
      try { lastModified = execFileSync('git', ['log', '-1', '--format=%cs', '--', relativePath || 'index.html'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* No invented modification date. */ }
    }
    return `  <url><loc>${escapeHtml(loc)}</loc>${lastModified ? `<lastmod>${escapeHtml(lastModified)}</lastmod>` : ''}</url>`;
  });
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

const repositories = readJson('assets/data/github-projects.json');
const repositoryByName = new Map(repositories.map((repository) => [repository.name, repository]));
const projects = readJson('assets/data/works.json')
  .map((project) => {
    const repository = repositoryByName.get(project.repository);
    return {
      ...project,
      language: repository?.language || project.language,
      stars: repository?.stars ?? project.stars,
      updated: repository?.updatedAt || project.updated,
      demo: project.demo || repository?.demo || ''
    };
  })
  .sort((a, b) => Number(a.rank) - Number(b.rank));
const posts = readJson('assets/data/blog.json').sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
const featuredNames = new Set(projects.map((project) => project.repository));
const moreRepositories = repositories.filter((repository) => !featuredNames.has(repository.name) && repository.name !== 'nandurpm');

replaceBlock('projects.html', 'PROJECTS_START', 'PROJECTS_END', projects.map(projectCard).join('\n'));
replaceBlock('projects.html', 'MORE_PROJECTS_START', 'MORE_PROJECTS_END', moreRepositories.map(repositoryCard).join('\n'));
replaceBlock('index.html', 'FEATURED_PROJECTS_START', 'FEATURED_PROJECTS_END', projects.slice(0, 4).map(projectCard).join('\n'));
replaceBlock('blog.html', 'BLOG_POSTS_START', 'BLOG_POSTS_END', posts.map((post) => blogCard(post, 'h2')).join('\n'));
replaceBlock('index.html', 'RECENT_POSTS_START', 'RECENT_POSTS_END', posts.slice(0, 3).map((post) => blogCard(post)).join('\n'));
renderSitemap(projects, posts);

// Apply the same head to existing and newly published pages, keeping metadata
// and the early theme bootstrap consistent with future publishing runs.
const publicPages = [...fs.readdirSync(ROOT).filter((name) => name.endsWith('.html')),
  ...listPublishedHtml('blog'), ...listPublishedHtml('works')];
const hashes = new Set();
for (const relativePath of publicPages) {
  const file = path.join(ROOT, relativePath);
  const post = posts.find((post) => post.url === relativePath);
  const html = normalizePage(fs.readFileSync(file, 'utf8'), relativePath, post);
  fs.writeFileSync(file, html);
  for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    hashes.add(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
  }
}
const headersPath = path.join(ROOT, '_headers');
const headers = fs.readFileSync(headersPath, 'utf8').replace(/script-src 'self'(?: 'sha256-[^']+')*/,
  `script-src 'self' ${[...hashes].sort().join(' ')}`);
fs.writeFileSync(headersPath, headers);

console.log(`Rendered ${projects.length} featured projects, ${moreRepositories.length} additional public repositories, ${posts.length} articles, and sitemap.xml.`);
