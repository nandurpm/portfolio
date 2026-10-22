/* Shared head and SEO normalization for the static publishing pipeline. */
import fs from 'node:fs';
import path from 'node:path';

export const SITE_URL = 'https://nandakumarm.dpdns.org';
const bootstrap = fs.readFileSync(new URL('./theme-bootstrap.html', import.meta.url), 'utf8').trim();
const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const decode = (value) => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');

export function normalizePage(source, relativePath, post) {
  const prefix = path.posix.dirname(relativePath) === '.' ? '' : '../';
  const title = decode(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Nandakumar M');
  const description = decode(source.match(/<meta name="description" content="([^"]*)"/i)?.[1] || title);
  const canonical = `${SITE_URL}/${relativePath === 'index.html' ? '' : relativePath}`;
  const pageImage = relativePath.startsWith('works/') ? source.match(/<img[^>]+src="([^"]+)"/i)?.[1] : null;
  const image = post ? new URL(post.image, `${SITE_URL}/`).href : pageImage ? new URL(pageImage, canonical).href : `${SITE_URL}/assets/images/profile.webp`;
  source = source.replace(/(<meta name="theme-color" content=")#07111f/g, '$1#09090b').replace(/(<meta name="theme-color" content=")#f3f8ff/g, '$1#f6f3ef');
  let html = source.replace(/\s*<!-- PAGE_METADATA_START -->[\s\S]*?<!-- PAGE_METADATA_END -->/g, '');
  html = html.replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/gi, '')
    .replace(/\s*<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/gi, '')
    .replace(/\s*<link rel="stylesheet" href="(?:\.\.\/|\/)?assets\/css\/(?:fonts|content-pages|theme|animations|main|polish|reveal|series)\.css">/g, '');
  html = html.replace(/(href|src)="\/assets\//g, `$1="${prefix}assets/`);
  // Remove the common bootstrap before inserting its single maintained copy.
  html = html.replace(/\s*<script data-theme-bootstrap>[\s\S]*?<\/script>/g, '');
  html = html.replace(/\s*<script>try\{document\.documentElement\.dataset\.theme=[\s\S]*?<\/script>/g, '');
  html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  ${bootstrap}`);
  let metadata = `\n  <!-- PAGE_METADATA_START -->\n  <link rel="canonical" href="${escape(canonical)}">`;
  for (const [key, value] of Object.entries({ type: post ? 'article' : 'website', title, description, url: canonical, image })) {
    metadata += `\n  <meta property="og:${key}" content="${escape(value)}">`;
  }
  for (const [key, value] of Object.entries({ card: 'summary_large_image', title, description, image })) {
    metadata += `\n  <meta name="twitter:${key}" content="${escape(value)}">`;
  }
  if (post && !/"@type"\s*:\s*"(?:BlogPosting|Article)"/.test(html)) {
    const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title,
      description: post.excerpt, datePublished: post.date, image: [image],
      author: { '@type': 'Person', name: 'Nandakumar M', url: `${SITE_URL}/` }, mainEntityOfPage: canonical };
    metadata += `\n  <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
  }
  metadata += '\n  <!-- PAGE_METADATA_END -->\n';
  const links = ['fonts', 'content-pages', 'theme', 'animations', 'main', 'polish', 'reveal']
    .map((name) => `  <link rel="stylesheet" href="${prefix}assets/css/${name}.css">`).join('\n');
  html = html.replace(/\s*<link rel="preload"[^>]*data-portfolio-font[^>]*>/g, '');
  const preload = [400, 800].map((weight) => `  <link rel="preload" as="font" type="font/woff2" crossorigin href="${prefix}assets/fonts/inter-latin-${weight}-normal.woff2" data-portfolio-font>`).join('\n');
  html = html.replace(/class="brand-mark"(?! aria-hidden)/g, 'class="brand-mark" aria-hidden="true"');
  html = html.replace(/(<a\b[^>]*class="brand"[^>]*?)\saria-label="[^"]*"/g, '$1');
  // Page-specific rules must follow the shared cascade.
  html = html.replace(/\s*<link rel="stylesheet" href="assets\/css\/about\.css">/g, '');
  return html.replace('</head>', `${metadata}${preload}\n${links}${relativePath === 'about.html' ? '\n  <link rel="stylesheet" href="assets/css/about.css">' : ''}\n  <link rel="stylesheet" href="${prefix}assets/css/series.css">\n</head>`);
}
