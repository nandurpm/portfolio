import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return [];
  const value = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!Array.isArray(value)) throw new Error(`${relativePath} must contain a JSON array.`);
  return value;
}

function writeJson(relativePath, value) {
  const fullPath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function decodeHtml(value = '') {
  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function parseMeta(html) {
  const metadata = {};
  for (const tag of html.match(/<meta\s+[^>]*>/gi) || []) {
    const attributes = {};
    const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = pattern.exec(tag))) {
      attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '');
    }
    if (attributes.name && Object.hasOwn(attributes, 'content')) {
      metadata[attributes.name.toLowerCase()] = attributes.content.trim();
    }
  }
  return metadata;
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function requireMeta(meta, names, source) {
  const missing = names.filter((name) => !meta[name]?.trim());
  if (missing.length) throw new Error(`${source}: missing metadata: ${missing.join(', ')}`);
}

function parseList(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function estimateReadTime(html) {
  const text = decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function resolveImage(uploadDir, requestedName, slug, existingImage) {
  if (requestedName?.startsWith('assets/')) {
    const existingPath = path.join(ROOT, requestedName);
    if (!fs.existsSync(existingPath)) throw new Error(`Referenced image does not exist: ${requestedName}`);
    return { source: null, publicPath: requestedName };
  }

  const candidates = [];
  if (requestedName) candidates.push(path.basename(requestedName));
  for (const file of fs.readdirSync(uploadDir)) {
    const extension = path.extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension) && slugify(path.basename(file, extension)) === slug) candidates.push(file);
  }

  for (const candidate of [...new Set(candidates)]) {
    const source = path.join(uploadDir, candidate);
    const extension = path.extname(candidate).toLowerCase();
    if (fs.existsSync(source) && IMAGE_EXTENSIONS.has(extension)) {
      return { source, extension };
    }
  }

  if (existingImage) return { source: null, publicPath: existingImage };
  throw new Error(`No cover image found for ${slug}. Upload a matching image or set the image metadata.`);
}

function copyImage(image, destinationDir, slug) {
  if (image.publicPath) return image.publicPath;
  fs.mkdirSync(path.join(ROOT, destinationDir), { recursive: true });
  const relativePath = path.posix.join(destinationDir, `${slug}${image.extension}`);
  fs.copyFileSync(image.source, path.join(ROOT, relativePath));
  return relativePath;
}

function removeSourceFiles(htmlPath, image) {
  fs.rmSync(htmlPath, { force: true });
  if (image.source) fs.rmSync(image.source, { force: true });
}

function upsert(items, key, entry) {
  const index = items.findIndex((item) => item[key] === entry[key]);
  if (index >= 0) items[index] = { ...items[index], ...entry };
  else items.push(entry);
}

function processBlog() {
  const uploadDir = path.join(ROOT, 'uploads/blog');
  if (!fs.existsSync(uploadDir)) return 0;
  const files = fs.readdirSync(uploadDir).filter((file) => file.toLowerCase().endsWith('.html'));
  if (!files.length) return 0;

  const posts = readJson('assets/data/blog.json');
  for (const file of files) {
    const sourcePath = path.join(uploadDir, file);
    const html = fs.readFileSync(sourcePath, 'utf8');
    const meta = parseMeta(html);
    requireMeta(meta, ['post-title', 'post-category', 'post-date', 'post-excerpt'], file);
    if (!isValidDate(meta['post-date'])) throw new Error(`${file}: post-date must use YYYY-MM-DD.`);

    const slug = slugify(meta['post-slug'] || path.basename(file, path.extname(file)) || meta['post-title']);
    if (!slug) throw new Error(`${file}: unable to create a valid slug.`);
    const existing = posts.find((post) => post.slug === slug);
    const image = resolveImage(uploadDir, meta['post-image'], slug, existing?.image);
    const imagePath = copyImage(image, 'assets/images/blog', slug);
    const outputPath = path.join(ROOT, 'blog', `${slug}.html`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(sourcePath, outputPath);

    upsert(posts, 'slug', {
      title: meta['post-title'],
      slug,
      category: meta['post-category'],
      date: meta['post-date'],
      readTime: meta['post-read-time'] || estimateReadTime(html),
      excerpt: meta['post-excerpt'],
      image: imagePath.replaceAll(path.sep, '/'),
      tags: parseList(meta['post-tags']),
      url: `blog/${slug}.html`
    });
    removeSourceFiles(sourcePath, image);
    console.log(`Published blog post: ${slug}`);
  }
  posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  writeJson('assets/data/blog.json', posts);
  return files.length;
}

function processProjects() {
  const uploadDir = path.join(ROOT, 'uploads/projects');
  if (!fs.existsSync(uploadDir)) return 0;
  const files = fs.readdirSync(uploadDir).filter((file) => file.toLowerCase().endsWith('.html'));
  if (!files.length) return 0;

  const projects = readJson('assets/data/works.json');
  for (const file of files) {
    const sourcePath = path.join(uploadDir, file);
    const html = fs.readFileSync(sourcePath, 'utf8');
    const meta = parseMeta(html);
    requireMeta(meta, ['project-title', 'project-category', 'project-description'], file);

    const slug = slugify(meta['project-slug'] || path.basename(file, path.extname(file)) || meta['project-title']);
    if (!slug) throw new Error(`${file}: unable to create a valid slug.`);
    const existing = projects.find((project) => project.slug === slug || project.url === `works/${slug}.html`);
    const image = resolveImage(uploadDir, meta['project-image'], slug, existing?.image);
    const imagePath = copyImage(image, 'assets/images/works', slug);
    const outputPath = path.join(ROOT, 'works', `${slug}.html`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(sourcePath, outputPath);

    const entry = {
      title: meta['project-title'],
      slug,
      category: meta['project-category'],
      description: meta['project-description'],
      image: imagePath.replaceAll(path.sep, '/'),
      url: `works/${slug}.html`,
      technologies: parseList(meta['project-technologies'])
    };
    if (meta['project-date']) entry.date = meta['project-date'];
    if (meta['project-github']) entry.github = meta['project-github'];
    if (meta['project-demo']) entry.demo = meta['project-demo'];

    const index = projects.findIndex((project) => project.slug === slug || project.url === `works/${slug}.html`);
    if (index >= 0) projects[index] = { ...projects[index], ...entry };
    else projects.unshift(entry);
    removeSourceFiles(sourcePath, image);
    console.log(`Published project: ${slug}`);
  }
  projects.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  writeJson('assets/data/works.json', projects);
  return files.length;
}

try {
  const published = processBlog() + processProjects();
  console.log(published ? `Published ${published} item(s).` : 'No upload HTML files found.');
} catch (error) {
  console.error(`Publishing failed: ${error.message}`);
  process.exitCode = 1;
}
