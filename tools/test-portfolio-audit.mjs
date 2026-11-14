import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { normalizePage } from '../scripts/site-pages.mjs';
import { dateText, normalizeAssetUrls } from '../scripts/site-assets.mjs';
const read = (file) => fs.readFileSync(file, 'utf8');
const pages = [...fs.readdirSync('.').filter(p => p.endsWith('.html')), ...['blog','works'].flatMap(d => fs.readdirSync(d).filter(p=>p.endsWith('.html')).map(p=>`${d}/${p}`))];
test('deep not-found recovery uses root URLs, no fake canonical or social URL', () => {
 const page = read('404.html');
 assert.doesNotMatch(page, /rel="canonical"|property="og:url"/);
 for (const [,url] of page.matchAll(/(?:href|src)="([^"]*)"/g)) assert.match(url, /^(?:\/|#|https?:|mailto:)/);
 assert.match(page, /href="\/about.html"/);
});
test('all public CSS and JS URLs are content-versioned consistently', () => {
 const versions = new Map();
 for (const file of pages) for (const [,asset,hash] of read(file).matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))\?v=([a-f0-9]{12})"/g)) {
  const expected = createHash('sha256').update(fs.readFileSync(asset.slice(1))).digest('hex').slice(0,12);
  assert.equal(hash,expected,`${file}: ${asset}`);
  if (versions.has(asset)) assert.equal(versions.get(asset),hash);
  versions.set(asset,hash);
 }
 assert.ok(versions.size >= 5);
});
test('relative URLs resolve correctly on nested pages and keep queries/fragments', () => {
 assert.equal(normalizeAssetUrls('<a href="../about.html#resume"><img src="../assets/images/og-card.png"></a>','works/example.html'), '<a href="/about.html#resume"><img src="/assets/images/og-card.png"></a>');
 assert.equal(dateText('2026-09-01T23:59:59-01:00'),'2 Sep 2026');
 assert.throws(()=>dateText('invalid'));
});
test('legacy aliases are small non-script redirects with canonical targets', () => {
 for (const [alias,target] of Object.entries({about:'about.html',projects:'projects.html',blog:'blog.html',home:'index.html'})) {
  const html=read(`${alias}/index.html`);
  assert.match(html,new RegExp(`url=/${target.replace('.','\\.')}`));
  assert.doesNotMatch(html,/<script|stylesheet/);
  assert.match(html,/noindex, follow/);
 }
 assert.match(read('resume.html'),/href="\/assets\/files\/resume.pdf"/);
 assert.match(read('about.html'),/href="\/assets\/files\/resume.pdf" download/);
 assert.match(fs.readFileSync('assets/files/resume.pdf').toString('ascii',0,4),/%PDF/);
 assert.throws(()=>normalizePage('<meta http-equiv="refresh" content="0; url=https://example.com">','bad.html'));
});
test('tracker info distinguishes signed-in browser access from local installed apps', () => {
 assert.match(read('savings-tracker.html'),/href="\/track\/"/);
 assert.match(read('savings-tracker.html'),/releases\/latest/);
 assert.doesNotMatch(read('savings-tracker.html'),/does not provide a browser version/);
 assert.match(read('savings-tracker-privacy.html'),/local storage/);
 assert.match(read('savings-tracker-privacy.html'),/session storage/);
 assert.match(read('savings-tracker-privacy.html'),/Browser access requires sign-in/);
});
test('renderer is idempotent across all generated pages, CSP and sitemap', () => {
 const files=[...pages,'_headers','sitemap.xml','assets/css/portfolio.css','about/index.html','projects/index.html','blog/index.html','home/index.html'];
 const before=files.map(p=>read(p));
 execFileSync('node',['scripts/render-static-content.mjs']);
 files.forEach((p,i)=>assert.equal(read(p),before[i],`${p} changed on second render`));
});
test('build sources do not leak via static Workers assets', () => {
 const ignored=read('.assetsignore').split('\n');
 for (const directory of ['tools','scripts','docs','reports','CONTENT_PUBLISHING.md']) assert.ok(ignored.includes(directory),directory);
 assert.match(read('wrangler.jsonc'),/"not_found_handling": "404-page"/);
 assert.doesNotMatch(read('_redirects'),/ 200/);
});

test('CSP hashes executable inline code but not structured data', () => {
 const policy=read('_headers').split('\n').find(line=>line.includes('Content-Security-Policy:'));
 const hashes=new Set([...policy.matchAll(/'sha256-([^']+)'/g)].map(m=>m[1]));
 for(const page of pages) for(const match of read(page).matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  const hash=createHash('sha256').update(match[1]).digest('base64');
  assert.equal(hashes.has(hash),!/type="application\/ld\+json"/i.test(match[0]),page);
 }
});
