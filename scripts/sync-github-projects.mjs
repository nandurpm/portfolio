/*
 * FILE: sync-github-projects.mjs
 * FILE PURPOSE: Builds a public-only GitHub repository snapshot for the portfolio.
 */

import fs from 'node:fs';
import path from 'node:path';

const OWNER = 'nandurpm';
const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'assets/data/github-projects.json');
const FEATURED_ORDER = [
  'diploma-notes',
  'polypmna',
  'internet-time-machine',
  'pss-billing-app',
  'project-digital-twin',
  'tech-calc',
  'question-machine',
  'electrical-troubleshooter'
];

const CATEGORY_BY_REPOSITORY = {
  'diploma-notes': 'Learning & Education',
  polypmna: 'Learning & Education',
  'poly-pmna-pdf-files': 'Learning & Education',
  'question-machine': 'Learning & Education',
  'electrical-troubleshooter': 'Engineering Tools',
  'energy-monitor': 'Engineering Tools',
  'motor-toolbox': 'Engineering Tools',
  'tech-calc': 'Engineering Tools',
  'component-vault': 'Engineering Tools',
  'resistor-vision': 'Engineering Tools',
  'pcb-component-finder': 'Engineering Tools',
  'signal-lab': 'Engineering Tools',
  'internet-time-machine': 'Monitoring & Diagnostics',
  'boot-inspector': 'Monitoring & Diagnostics',
  'system-change-tracker': 'Monitoring & Diagnostics',
  'lan-map': 'Monitoring & Diagnostics',
  'wifi-heatmap': 'Monitoring & Diagnostics',
  'storage-forensics': 'Monitoring & Diagnostics',
  'privacy-inspector': 'Monitoring & Diagnostics',
  'usb-device-historian': 'Monitoring & Diagnostics',
  'project-digital-twin': 'Developer Tools',
  'repo-time-machine': 'Developer Tools',
  'folder-archaeologist': 'Developer Tools',
  'diagram-script': 'Developer Tools',
  'screen-explainer': 'Developer Tools',
  'mini-tool-factory': 'Developer Tools',
  'command-center': 'Productivity Tools',
  'digital-life-dashboard': 'Productivity Tools',
  portfolio: 'Web Development',
  'pss-billing-app': 'Applications',
  'sci-fi-calc': 'Engineering Tools'
};

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'nandurpm-portfolio-project-sync',
  'X-GitHub-Api-Version': '2022-11-28'
};

if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

function titleFromName(name) {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function cleanMarkdown(value) {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*|:].*$/gm, ' ')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readmeSummary(markdown, fallback) {
  const text = cleanMarkdown(markdown);
  const candidate = text || String(fallback || '').trim();
  if (candidate.length <= 280) return candidate;
  const shortened = candidate.slice(0, 277);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 180 ? boundary : 277)}…`;
}

async function github(url, accept = headers.Accept) {
  const response = await fetch(url, { headers: { ...headers, Accept: accept } });
  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub request failed (${response.status}) for ${url}${remaining ? `; remaining: ${remaining}` : ''}`);
  }
  return response;
}

async function readReadme(repo) {
  const url = `https://api.github.com/repos/${OWNER}/${encodeURIComponent(repo.name)}/readme`;
  try {
    const response = await github(url, 'application/vnd.github.raw+json');
    return await response.text();
  } catch (error) {
    if (String(error.message).includes('(404)')) return '';
    throw error;
  }
}

const response = await github(`https://api.github.com/users/${OWNER}/repos?type=owner&sort=updated&per_page=100`);
const repositories = (await response.json())
  .filter((repo) => repo.visibility === 'public' && !repo.private && !repo.fork && !repo.archived);

const readmes = new Map(await Promise.all(
  repositories
    .filter((repo) => FEATURED_ORDER.includes(repo.name))
    .map(async (repo) => [repo.name, await readReadme(repo)])
));

const snapshots = repositories.map((repo) => {
  const readme = readmes.get(repo.name) || '';
  return {
    name: repo.name,
    title: titleFromName(repo.name),
    description: String(repo.description || '').trim(),
    readmeSummary: readmeSummary(readme, repo.description),
    category: CATEGORY_BY_REPOSITORY[repo.name] || 'Developer Tools',
    language: repo.language || 'Documentation',
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    stars: Number(repo.stargazers_count || 0),
    forks: Number(repo.forks_count || 0),
    updatedAt: repo.pushed_at || repo.updated_at,
    github: repo.html_url,
    demo: repo.homepage || '',
    featured: FEATURED_ORDER.includes(repo.name),
    rank: FEATURED_ORDER.indexOf(repo.name) >= 0 ? FEATURED_ORDER.indexOf(repo.name) + 1 : null
  };
});

snapshots.sort((a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.featured && b.featured) return a.rank - b.rank;
  return String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.name.localeCompare(b.name);
});

fs.writeFileSync(OUTPUT, `${JSON.stringify(snapshots, null, 2)}\n`);
console.log(`Wrote ${snapshots.length} public, non-fork, non-archived repositories to ${path.relative(ROOT, OUTPUT)}.`);
