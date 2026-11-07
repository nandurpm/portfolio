import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
/** Compare extracted Web/Windows/Android payloads. Different UI/auth modes are expected. */
export async function verifyFinancialParity(roots) {
  if (roots.length < 2) throw Error('Supply at least two extracted payload directories.');
  const manifests = [];
  for (const root of roots) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'build.json'), 'utf8'));
    for (const key of ['financialLogicSha256', 'dataModelSha256'])
      if (!/^[a-f0-9]{64}$/.test(manifest[key] ?? '')) throw Error(`Missing ${key}: ${root}`);
    if (manifest.dirty !== false || !/^\d+\.\d+\.\d+$/.test(manifest.version ?? '') || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? '') || !/^[a-f0-9]{40}$/.test(manifest.sourceTree ?? '') || !['web', 'release'].includes(manifest.mode)) throw Error(`Not a clean production payload: ${root}`);
    if (!manifest.files?.['index.html']) throw Error(`Incomplete payload inventory: ${root}`);
    for (const [file, digest] of Object.entries(manifest.files)) {
      if (path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) throw Error('Unsafe manifest path');
      const actual = createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex');
      if (actual !== digest) throw Error(`Payload checksum mismatch: ${file}`);
    }
    manifests.push(manifest);
  }
  for (const key of ['version', 'sourceCommit', 'sourceTree', 'financialLogicSha256', 'dataModelSha256'])
    if (manifests.some(item => item[key] !== manifests[0][key])) throw Error(`Platform mismatch: ${key}`);
  return {version: manifests[0].version, sourceCommit: manifests[0].sourceCommit,
    financialLogicSha256: manifests[0].financialLogicSha256, dataModelSha256: manifests[0].dataModelSha256,
    payloads: roots.length, verified: true};
}
if (process.argv[1]?.endsWith('verify-financial-parity.mjs')) console.log(JSON.stringify(await verifyFinancialParity(process.argv.slice(2))));
