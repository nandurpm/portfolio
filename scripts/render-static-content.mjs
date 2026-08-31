/*
 * FILE: render-static-content.mjs
 * FILE PURPOSE: Repository automation that regenerates static project and blog cards from the published content indexes.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const value = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
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
  const replacement = `${start}\n${markup.trim()}\n          ${end}`;
  const updated = source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
  fs.writeFileSync(fullPath, updated);
}

function listPublishedHtml(directory) {
  return fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => `${directory}/${entry.name}`);
}

function renderSitemap(projects, posts) {
  const siteUrl = `https://${fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim()}`;
  const topLevelPages = ['', 'about.html', 'projects.html', 'blog.html', 'resume.html', 'contact.html', 'works.html'];
  const indexedContent = [...projects.map((project) => project.url), ...posts.map((post) => post.url)]
    .filter((url) => typeof url === 'string' && !/^[a-z]+:\/\//i.test(url))
    .map((url) => url.split('#')[0].split('?')[0]);
  const publishedContent = [...listPublishedHtml('works'), ...listPublishedHtml('blog')];
  const paths = [...new Set([...topLevelPages, ...indexedContent, ...publishedContent])];
  const postDates = new Map(posts.map((post) => [post.url, post.date]));
  const urls = paths.map((relativePath) => {
    const loc = relativePath ? `${siteUrl}/${relativePath}` : `${siteUrl}/`;
    const lastModified = postDates.get(relativePath);
    const lastmod = lastModified ? `<lastmod>${escapeHtml(lastModified)}</lastmod>` : '';
    return `  <url><loc>${escapeHtml(loc)}</loc>${lastmod}</url>`;
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
}

function projectCard(project) {
  const tags = (project.technologies || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join('');
  const image = `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" loading="lazy">`;
  const title = `<h3>${escapeHtml(project.title)}</h3>`;
  const url = project.url ? escapeHtml(project.url) : '';
  const searchText = [project.title, project.category, project.description, ...(project.technologies || [])].join(' ').toLowerCase();
  return `          <article class="project-card" data-reveal="up" data-category="${escapeHtml(project.category)}" data-search="${escapeHtml(searchText)}">
            ${url ? `<a href="${url}" aria-label="Open ${escapeHtml(project.title)} project page">${image}</a>` : image}
            <div class="card-body">
              <div class="card-meta"><span class="pill">${escapeHtml(project.category)}</span>${tags}</div>
              ${url ? `<a href="${url}">${title}</a>` : title}
              <p>${escapeHtml(project.description)}</p>
            </div>
          </article>`;
}

function blogCard(post) {
  const url = escapeHtml(post.url);
  const searchText = [post.title, post.excerpt, post.category, ...(post.tags || [])].join(' ').toLowerCase();
  return `          <article class="blog-card" data-reveal="up" id="post-${escapeHtml(post.slug)}" data-category="${escapeHtml(post.category)}" data-search="${escapeHtml(searchText)}">
            <a href="${url}" aria-label="Open ${escapeHtml(post.title)}"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
            <div class="card-body">
              <div class="card-meta"><span class="pill">${escapeHtml(post.category)}</span><span class="pill">${escapeHtml(post.readTime)}</span></div>
              <a href="${url}"><h3>${escapeHtml(post.title)}</h3></a>
              <p>${escapeHtml(post.excerpt)}</p>
              <div class="card-actions"><a href="${url}">Read More</a><span>${escapeHtml(post.date)}</span></div>
            </div>
          </article>`;
}

const projects = readJson('assets/data/works.json');
const posts = readJson('assets/data/blog.json').sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

const projectMarkup = projects.length ? projects.map(projectCard).join('\n') : '          <p class="empty-state">No projects published yet.</p>';
const featuredMarkup = projects.length ? projects.slice(0, 3).map(projectCard).join('\n') : '          <p class="empty-state">No projects published yet.</p>';
const blogMarkup = posts.length ? posts.map(blogCard).join('\n') : '          <p class="empty-state">No blog posts published yet.</p>';
const recentMarkup = posts.length ? posts.slice(0, 3).map(blogCard).join('\n') : '          <p class="empty-state">No blog posts published yet.</p>';

replaceBlock('projects.html', 'PROJECTS_START', 'PROJECTS_END', projectMarkup);
replaceBlock('index.html', 'FEATURED_PROJECTS_START', 'FEATURED_PROJECTS_END', featuredMarkup);
replaceBlock('blog.html', 'BLOG_POSTS_START', 'BLOG_POSTS_END', blogMarkup);
replaceBlock('index.html', 'RECENT_POSTS_START', 'RECENT_POSTS_END', recentMarkup);
renderSitemap(projects, posts);

console.log(`Rendered ${projects.length} projects, ${posts.length} blog posts, and sitemap.xml.`);
