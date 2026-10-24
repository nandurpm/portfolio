import fs from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
const expectedCommit = process.argv[3];
const trustedPath = process.argv[4];
if (!trustedPath)
  throw Error('Supply the trusted build.json downloaded from the approved CI artifact');
const trusted = JSON.parse(await fs.readFile(trustedPath, 'utf8'));
if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? ''))
  throw Error('Supply the expected 40-character source commit as the second argument');
const base = new URL(process.argv[2] ?? 'https://nandakumarm.dpdns.org/track/');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
  throw Error('Use a public HTTP(S) tracker URL without credentials');
const manifestUrl = new URL('build.json', base),
  res = await fetch(manifestUrl);
if (!res.ok) throw Error('Deployment has no readable build manifest: ' + res.status);
if (!res.headers.get('content-type')?.includes('application/json'))
  throw Error('Deployment manifest route returned non-JSON content');
const manifest = await res.json();
if (
  !manifest.requiresSignIn ||
  manifest.mode !== 'web' ||
  !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
  !manifest.files?.['index.html']
)
  throw Error('Invalid deployment manifest');
if (manifest.sourceCommit !== expectedCommit)
  throw Error('Deployment source commit does not match the approved release');
if (!isDeepStrictEqual(manifest, trusted))
  throw Error('Deployment manifest differs from the approved CI artifact');
for (const [file, expected] of Object.entries(manifest.files)) {
  if (file.startsWith('/') || file.split('/').includes('..')) throw Error('Unsafe asset path');
  const asset = new URL(file, base);
  if (asset.origin !== base.origin) throw Error('Cross-origin manifest asset');
  const reply = await fetch(asset);
  if (!reply.ok || new URL(reply.url).origin !== base.origin)
    throw Error('Asset unavailable or redirected off origin');
  const hash = createHash('sha256')
    .update(new Uint8Array(await reply.arrayBuffer()))
    .digest('hex');
  if (hash !== expected) throw Error('Deployed asset checksum mismatch: ' + file);
}
console.log(
  JSON.stringify({
    verified: true,
    sourceCommit: manifest.sourceCommit,
    sourceTree: manifest.sourceTree,
    builtAt: manifest.builtAt,
    files: Object.keys(manifest.files).length,
  }),
);
