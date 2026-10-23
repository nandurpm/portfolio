/* Shared public-page chrome, accessibility and metadata. No runtime build required. */
import fs from 'node:fs';
import path from 'node:path';
export const SITE_URL = 'https://nandakumarm.dpdns.org';
const bootstrap = fs.readFileSync(new URL('./theme-bootstrap.html', import.meta.url), 'utf8').trim();
const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const decode = (value) => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const dateText = (value) => new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }).format(new Date(value));

export function normalizePage(source, relativePath, post) {
  const prefix = path.posix.dirname(relativePath) === '.' ? '' : '../';
  const title = decode(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Nandakumar M');
  const description = decode(source.match(/<meta name="description" content="([^"]*)"/i)?.[1] || title);
  const canonical = `${SITE_URL}/${relativePath === 'index.html' ? '' : relativePath}`;
  const image = `${SITE_URL}/assets/images/og-card.png`;
  const imageAlt = 'Nandakumar M — Electrical Design Engineer, Chennai — The Engineering Series';
  let html = source.replace(/\s*<!-- PAGE_METADATA_START -->[\s\S]*?<!-- PAGE_METADATA_END -->/g, '')
    .replace(/\s*<meta name="keywords"[^>]*>/gi, '')
    .replace(/\s*<link rel="preload" as="image"[^>]*>/g, '')
    .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/gi, '')
    .replace(/\s*<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/gi, '')
    .replace(/\s*<link rel="stylesheet" href="(?:\.\.\/|\/)?assets\/css\/(?:fonts|content-pages|theme|animations|main|polish|reveal|series|portfolio)\.css">/g, '')
    .replace(/\s*<script data-theme-bootstrap>[\s\S]*?<\/script>/g, '')
    .replace(/(<meta name="theme-color" content=")[^"]+(" media="\(prefers-color-scheme: dark\)")/g, '$1#17272a$2')
    .replace(/(<meta name="theme-color" content=")[^"]+(" media="\(prefers-color-scheme: light\)")/g, '$1#f6f3ef$2');
  html = html.replace(/(href|src)="\/assets\//g, `$1="${prefix}assets/`);
  html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  ${bootstrap}`);
  html = html.replace(/<html(?:\s+lang="[^"]*")?>/i, '<html lang="en">');
  // A single literal sentence avoids duplication in text extraction and screen readers.
  html = html.replace(/<main(?![^>]*\bid=)([^>]*)>/, '<main id="main-content" tabindex="-1"$1>');
  const mainId = html.match(/<main[^>]*id="([^"]+)"/)?.[1] || 'main-content';
  html = html.replace(/<a class="skip-link"[^>]*>[\s\S]*?<\/a>/g, '');
  html = html.replace(/(<body[^>]*>)/, `$1\n  <a class="skip-link" href="#${mainId}">Skip to main content</a>`);
  html = html.replace(/<div\b([^>]*aria-label="[^"]*"[^>]*)>/g, (tag, attrs) => /\brole=/.test(attrs) ? tag : `<div role="group"${attrs}>`);
  html = html.replace(/<nav class="site-nav"(?![^>]*\bid=)/g, '<nav class="site-nav" id="main-navigation"');
  html = html.replace(/<nav class="site-nav"[^>]*>[\s\S]*?<\/nav>/g, () => {
    const current = relativePath.startsWith('works/') ? 'projects.html' : relativePath.startsWith('blog/') ? 'blog.html' : relativePath;
    return `<nav class="site-nav" id="main-navigation" aria-label="Main navigation">${[['index.html','Home'],['projects.html','Projects'],['blog.html','Articles'],['about.html','About'],['contact.html','Contact']].map(([url,label]) => `<a href="${prefix}${url}"${current === url ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
  });
  html = html.replace(/<button class="nav-toggle"(?![^>]*aria-controls)/g, '<button class="nav-toggle" aria-controls="main-navigation"');
  html = html.replace(/<a\b([^>]*href="https?:\/\/[^>]+)>([\s\S]*?)<\/a>/gi, (_, attrs, text) => {
    attrs = attrs.replace(/\s(?:target|rel)="[^"]*"/g, '');
    return `<a${attrs} target="_blank" rel="noopener noreferrer">${text.replace(/→/g, '↗')}</a>`;
  });
  html = html.replace(/<a\b([^>]*href="(?!https?:\/\/)[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, text) => `<a${attrs}>${text.replace(/↗/g, '→')}</a>`);
  html = html.replace(/<time datetime="([\d-]{10})"[^>]*>[^<]*<\/time>/g, (_, value) => `<time datetime="${value}">${dateText(value)}</time>`);
  html = html.replace(/<span>(\d{4}-\d{2}-\d{2})<\/span>/g, (_, value) => `<time datetime="${value}">${dateText(value)}</time>`);
  // Keep original JPG files available at their established URLs.
  html = html.replace(/(assets\/images\/blog\/blog-\d+)\.jpg/g, '$1.webp');
  html = html.replaceAll('profile-480.webp 480w, assets/images/profile.webp 900w', 'profile-480.webp 480w, assets/images/profile-768.webp 768w, assets/images/profile.webp 900w');
  html = html.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    if (!/\bdecoding=/.test(attrs)) attrs += ' decoding="async"';
    const isHero = relativePath === 'index.html' && /profile\.webp/.test(attrs);
    if (isHero) {
      if (!/\bsrcset=/.test(attrs)) attrs += ' srcset="assets/images/profile-480.webp 480w, assets/images/profile-768.webp 768w, assets/images/profile.webp 900w" sizes="(max-width: 760px) 100vw, 48vw"';
    } else if (!/fetchpriority="high"/.test(attrs) && !/\bloading=/.test(attrs)) attrs += ' loading="lazy"';
    return `<img${attrs}>`;
  });
  // Preserve privacy/support links in the app's public information pages.
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/g, (old) => {
    const extras = [...old.matchAll(/<a\b[^>]+href="(?:[^\"]*privacy[^\"]*|mailto:nandhakumardesign[^\"]*)"[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]).join('');
    return `<footer class="site-footer"><p>&copy; <span data-year>2026</span> Nandakumar M.</p><nav aria-label="Footer"><a href="mailto:nandakumarmkdpm@gmail.com">Email Nandakumar</a><a href="https://github.com/nandurpm" target="_blank" rel="noopener noreferrer">GitHub ↗</a><span class="social-placeholder">LinkedIn — coming soon</span><!-- TODO: replace with real details: LinkedIn profile URL; turn this span into an external link and add it to Person.sameAs. -->${extras}</nav></footer>`;
  });
  let metadata = `\n  <!-- PAGE_METADATA_START -->\n  <link rel="canonical" href="${escape(canonical)}">`;
  const og = { type:post ? 'article':'website', title, description, url:canonical, image, 'image:width':'1200', 'image:height':'630', 'image:alt':imageAlt };
  for (const [key,value] of Object.entries(og)) metadata += `\n  <meta property="og:${key}" content="${escape(value)}">`;
  for (const [key,value] of Object.entries({ card:'summary_large_image', title, description, image, 'image:alt':imageAlt })) metadata += `\n  <meta name="twitter:${key}" content="${escape(value)}">`;
  // Replace Person and BlogPosting data on every render, avoiding stale social cards.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (tag) => /"@type"\s*:\s*"(?:Person|BlogPosting|Article)"/.test(tag) ? '' : tag);
  let schema;
  if (post) schema = { '@context':'https://schema.org', '@type':'BlogPosting', headline:post.title, description:post.excerpt, datePublished:post.date, image:[image], author:{'@type':'Person', name:'Nandakumar M', url:`${SITE_URL}/`}, mainEntityOfPage:canonical };
  if (relativePath === 'index.html' || relativePath === 'about.html') schema = { '@context':'https://schema.org', '@type':'Person', name:'Nandakumar M', jobTitle:'Electrical and Electronics Design Engineer', address:{'@type':'PostalAddress',addressLocality:'Chennai'}, url:`${SITE_URL}/`, sameAs:['https://github.com/nandurpm'] };
  if (schema) metadata += `\n  <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`;
  metadata += '\n  <!-- PAGE_METADATA_END -->\n';
  html = html.replace(/\s*<link rel="preload"[^>]*data-portfolio-font[^>]*>/g, '');
  html = html.replace(/\s*<link[^>]+(?:rel="icon"|rel="apple-touch-icon"|rel="manifest")[^>]*>/g, '');
  const icons = `  <link rel="icon" href="${prefix}favicon.ico" sizes="any">\n  <link rel="icon" type="image/png" sizes="32x32" href="${prefix}assets/images/favicon-32.png">\n  <link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/images/apple-touch-icon.png">\n  <link rel="manifest" href="${prefix}manifest.webmanifest">`;
  const heroPreload = relativePath === 'index.html' ? '\n  <link rel="preload" as="image" href="assets/images/profile.webp" imagesrcset="assets/images/profile-480.webp 480w, assets/images/profile-768.webp 768w, assets/images/profile.webp 900w" imagesizes="(max-width: 760px) 100vw, 48vw" fetchpriority="high">' : '';
  const links = ['portfolio'].map((name) => `  <link rel="stylesheet" href="${prefix}assets/css/${name}.css">`).join('\n');
  html = html.replace(/\s*<link rel="stylesheet" href="assets\/css\/about\.css">/g, '');
  return html.replace('</head>', `${metadata}${icons}${heroPreload}\n${links}\n</head>`).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}
