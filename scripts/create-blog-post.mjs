#!/usr/bin/env node
/*
 * ============================================================
 * FILE: create-blog-post.mjs
 * PURPOSE: Validates blog metadata and stages a complete static
 *          article plus optional cover image for publication.
 * ============================================================
 */

/**
 * Create a staged blog post for the portfolio publishing workflow.
 *
 * Usage:
 *   node scripts/create-blog-post.mjs path/to/post.json
 *   node scripts/create-blog-post.mjs path/to/post.json --force
 *
 * The JSON file may contain:
 *   title, slug, category, date, excerpt, tags, readTime,
 *   image, imageFile, contentFile, content
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const force = args.includes('--force');
const inputArg = args.find((arg) => !arg.startsWith('--'));

function fail(message) {
  console.error(`Create blog post failed: ${message}`);
  process.exit(1);
}

if (!inputArg) fail('provide a metadata JSON file. Example: node scripts/create-blog-post.mjs post.json');

const inputPath = path.resolve(ROOT, inputArg);
if (!fs.existsSync(inputPath)) fail(`metadata file not found: ${inputArg}`);

let values;
try {
  values = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${inputArg}: ${error.message}`);
}

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const title = String(values.title || '').trim();
const slug = slugify(values.slug || title);
const category = String(values.category || '').trim();
const date = String(values.date || '').trim();
const excerpt = String(values.excerpt || '').trim();
const tags = Array.isArray(values.tags)
  ? values.tags.map((tag) => String(tag).trim()).filter(Boolean)
  : String(values.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
const readTime = String(values.readTime || '').trim();

if (!title) fail('title is required');
if (!slug) fail('slug could not be generated from title');
if (!category) fail('category is required');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
  fail('date must use YYYY-MM-DD');
}
if (!excerpt) fail('excerpt is required');
if (!readTime) fail('readTime is required, for example "6 min read"');

const contentPath = values.contentFile ? path.resolve(path.dirname(inputPath), values.contentFile) : null;
let content = String(values.content || '').trim();
if (contentPath) {
  if (!fs.existsSync(contentPath)) fail(`content file not found: ${values.contentFile}`);
  content = fs.readFileSync(contentPath, 'utf8').trim();
}
if (!content) fail('provide content or contentFile');

const imagePath = values.imageFile ? path.resolve(path.dirname(inputPath), values.imageFile) : null;
let imageName = String(values.image || '').trim();
if (imagePath) {
  if (!fs.existsSync(imagePath)) fail(`image file not found: ${values.imageFile}`);
  const extension = path.extname(imagePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(extension)) fail(`unsupported image type: ${extension}`);
  imageName = `${slug}${extension}`;
}
if (!imageName) fail('provide image or imageFile');
if (slugify(path.basename(imageName, path.extname(imageName))) !== slug) {
  fail(`image filename must match the slug: ${slug}${path.extname(imageName)}`);
}

const uploadDir = path.join(ROOT, 'uploads/blog');
const htmlPath = path.join(uploadDir, `${slug}.html`);
const stagedImagePath = path.join(uploadDir, imageName);
if (!force && (fs.existsSync(htmlPath) || fs.existsSync(stagedImagePath))) {
  fail(`staged files already exist for ${slug}; use --force to replace them`);
}

const imageSrc = `../assets/images/blog/${imageName}`;
const canonical = `https://nandakumarm.dpdns.org/blog/${slug}.html`;
const schema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description: excerpt,
  datePublished: date,
  dateModified: date,
  image: [`https://nandakumarm.dpdns.org/assets/images/blog/${imageName}`],
  author: { '@type': 'Person', name: 'Nandakumar M', url: 'https://nandakumarm.dpdns.org/' },
  mainEntityOfPage: canonical,
  keywords: tags.join(', ')
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(excerpt)}">
  <meta name="author" content="Nandakumar M">
  <meta name="post-title" content="${escapeHtml(title)}">
  <meta name="post-slug" content="${escapeHtml(slug)}">
  <meta name="post-category" content="${escapeHtml(category)}">
  <meta name="post-date" content="${escapeHtml(date)}">
  <meta name="post-excerpt" content="${escapeHtml(excerpt)}">
  <meta name="post-tags" content="${escapeHtml(tags.join(', '))}">
  <meta name="post-read-time" content="${escapeHtml(readTime)}">
  <meta name="post-image" content="${escapeHtml(imageName)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(excerpt)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://nandakumarm.dpdns.org/assets/images/blog/${imageName}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(excerpt)}">
  <meta name="twitter:image" content="https://nandakumarm.dpdns.org/assets/images/blog/${imageName}">
  <script type="application/ld+json">${schema}</script>
  <title>${escapeHtml(title)} | Nandakumar M</title>
  <link rel="stylesheet" href="../assets/css/theme.css">
  <link rel="stylesheet" href="../assets/css/animations.css">
  <link rel="stylesheet" href="../assets/css/main.css">
  <link rel="stylesheet" href="/assets/css/reveal.css">
</head>
<body>
  <div class="site-shell">
    <header class="site-header glass">
      <a class="brand" href="../index.html" aria-label="Nandakumar M home"><span class="brand-mark">NM</span><span><strong>Nandakumar M</strong><small>Electrical &amp; Electronics Design Engineer</small></span></a>
      <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav class="site-nav" aria-label="Main navigation"><a href="../index.html">Home</a><a href="../projects.html">Projects</a><a class="active" href="../blog.html" aria-current="page">Blog</a><a href="../about.html">About</a></nav>
      <button class="theme-toggle" type="button" aria-label="Toggle dark and light theme"><span class="theme-icon" aria-hidden="true"></span></button>
    </header>
    <main>
      <article class="blog-article">
        <header class="article-header">
          <p class="eyebrow"><a href="../blog.html">← Back to Blog</a></p>
          <h1>${escapeHtml(title)}</h1>
          <div class="article-meta"><time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time><span>${escapeHtml(readTime)}</span><span>${escapeHtml(category)}</span></div>
          <img src="${imageSrc}" alt="${escapeHtml(values.alt || title)}" class="article-image">
        </header>
        <div class="article-content">${content}</div>
        ${tags.length ? `<div class="article-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <footer class="article-footer"><a class="btn ghost" href="../blog.html">← Back to all posts</a></footer>
      </article>
    </main>
    <footer class="site-footer"><p>&copy; <span data-year>2026</span> Nandakumar M.</p><div><a href="mailto:nandakumarmkdpm@gmail.com">Email</a><a href="https://github.com/nandurpm" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>
  </div>
  <script src="../assets/js/theme.js"></script>
  <script src="../assets/js/main.js"></script>
  <script src="/assets/js/reveal.js"></script>
</body>
</html>
`;

fs.mkdirSync(uploadDir, { recursive: true });
fs.writeFileSync(htmlPath, html);
if (imagePath) fs.copyFileSync(imagePath, stagedImagePath);

console.log(`Staged blog post: uploads/blog/${slug}.html`);
if (imagePath) console.log(`Staged cover image: uploads/blog/${imageName}`);
console.log('Next: git add uploads/blog && git commit -m "Stage blog post" && git push origin main');
