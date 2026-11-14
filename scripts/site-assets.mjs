import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Root URLs also work when the custom 404 is served at an unknown nested path.
export function normalizeAssetUrls(html, pagePath) {
  const base = new URL(pagePath, 'https://portfolio.invalid/');
  const resolve = (value) => {
    if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return value;
    const url = new URL(value.replaceAll('&amp;', '&'), base);
    if (/\.(?:css|js)$/.test(url.pathname) && url.pathname.startsWith('/assets/')) {
      const file = path.join(process.cwd(), url.pathname.slice(1));
      if (!fs.existsSync(file)) throw new Error(`Missing portfolio asset: ${url.pathname}`);
      url.search = `?v=${createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12)}`;
    }
    return `${url.pathname}${url.search}${url.hash}`.replaceAll('&', '&amp;');
  };
  return html.replace(/\b(href|src|poster|action)="([^"]*)"/g, (_, key, value) => `${key}="${resolve(value)}"`)
    .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (_, key, values) => `${key}="${values.split(',').map((candidate) => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      return [resolve(url), ...descriptor].join(' ');
    }).join(', ')}"`);
}

// Fixed English month names avoid locale/ICU differences between build machines.
export function dateText(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid publication date: ${value}`);
  return `${date.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
