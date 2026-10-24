import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const git = (...args) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};
export function getBuildInfo(mode) {
  const sourceCommit = git('rev-parse', 'HEAD');
  if (!/^[a-f0-9]{40}$/.test(sourceCommit))
    throw Error('Build requires a Git checkout with an exact source commit');
  const sourceTree = git('rev-parse', 'HEAD:tools/tracker-source');
  const dirty = !!git('status', '--porcelain', '--untracked-files=no', '--', '.');
  if (process.env.GITHUB_ACTIONS === 'true' && dirty)
    throw Error('Release build requires a clean source checkout');
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch && !/^\d+$/.test(epoch)) throw Error('SOURCE_DATE_EPOCH must be integer seconds');
  return {
    schemaVersion: 1,
    version: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    sourceCommit,
    sourceTree,
    dirty,
    builtAt: new Date(epoch ? Number(epoch) * 1000 : Date.now()).toISOString(),
    mode,
    nodeVersion: process.versions.node,
    lockSha256: createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'),
  };
}
