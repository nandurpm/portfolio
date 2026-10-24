import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
export async function verifyBuild(root) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'build.json'), 'utf8'));
  if (
    manifest.mode !== 'web' ||
    !manifest.requiresSignIn ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceTree)
  )
    throw Error('Invalid authenticated web build identity');
  const sourceTree = execFileSync('git', ['rev-parse', 'HEAD:tools/tracker-source'], {
    encoding: 'utf8',
  }).trim();
  if (manifest.sourceTree !== sourceTree) throw Error('Build does not match current source tree');
  if (process.env.GITHUB_ACTIONS === 'true' && manifest.dirty)
    throw Error('Dirty release manifest');
  if (!manifest.files['index.html'] || !Object.keys(manifest.files).some((p) => p.endsWith('.js')))
    throw Error('Build asset inventory incomplete');
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (file.startsWith('/') || file.split('/').includes('..')) throw Error('Unsafe manifest path');
    const actual = createHash('sha256')
      .update(await fs.readFile(path.join(root, file)))
      .digest('hex');
    if (actual !== expected) throw Error('Build checksum mismatch: ' + file);
  }
  return manifest;
}
if (process.argv[1]?.endsWith('verify-build.mjs')) {
  const result = await verifyBuild(process.argv[2] ?? 'dist-web');
  console.log(
    JSON.stringify({
      sourceCommit: result.sourceCommit,
      files: Object.keys(result.files).length,
      verified: true,
    }),
  );
}
