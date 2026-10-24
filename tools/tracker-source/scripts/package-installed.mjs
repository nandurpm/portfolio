import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar'),
  R = require('resedit');
const runtime = process.argv[2],
  destination = process.argv[3];
if (!runtime || !destination)
  throw Error(
    'Usage: node scripts/package-installed.mjs <existing Windows app folder> <staging folder>',
  );
const root = process.cwd(),
  stage = path.resolve(destination),
  payload = path.join(stage, 'payload');
const mainBundle = await fs.readFile(path.join(root, 'dist-electron/main.cjs'), 'utf8');
if (mainBundle.includes('// src/domain/seed.json'))
  throw Error(
    'Build with npm run build:release before packaging. A private development template was detected.',
  );
await fs.mkdir(payload, { recursive: true });
for (const name of [
  'dist',
  'dist-electron',
  'build',
  'docs/Inter-LICENSE.txt',
  'LICENSE',
  'package.json',
]) {
  await fs.cp(path.join(root, name), path.join(payload, name), { recursive: true });
}
await fs.mkdir(path.join(stage, 'resources'), { recursive: true });
const archive = path.join(stage, 'resources/app.asar');
await asar.createPackage(payload, archive);
const header = asar.getRawHeader(archive).headerString;
const hash = createHash('sha256').update(header).digest('hex');
const exeName = 'Savings and Expense Tracker.exe';
const exe = R.NtExecutable.from(await fs.readFile(path.join(runtime, exeName)), {
  ignoreCert: true,
});
const resources = R.NtExecutableResource.from(exe);
resources.entries = resources.entries.filter(
  (e) => !(e.type === 'INTEGRITY' && e.id === 'ELECTRONASAR'),
);
const v = R.Resource.VersionInfo.fromEntries(resources.entries)[0];
const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
v.setFileVersion(version);
v.setProductVersion(version);
v.outputToResourceEntries(resources.entries);
const lang = v.getAllLanguagesForStringValues()[0];
resources.entries.push({
  type: 'INTEGRITY',
  id: 'ELECTRONASAR',
  lang: lang.lang,
  codepage: lang.codepage,
  bin: Buffer.from(JSON.stringify([{ file: 'resources\\app.asar', alg: 'SHA256', value: hash }])),
});
resources.outputResource(exe);
await fs.writeFile(path.join(stage, exeName), Buffer.from(exe.generate()));
const check = R.NtExecutableResource.from(
  R.NtExecutable.from(await fs.readFile(path.join(stage, exeName))),
);
const entry = check.entries.find((e) => e.type === 'INTEGRITY' && e.id === 'ELECTRONASAR');
if (JSON.parse(Buffer.from(entry.bin).toString())[0].value !== hash)
  throw Error('Integrity resource mismatch');
await fs.writeFile(
  path.join(stage, 'build-info.json'),
  JSON.stringify(
    { version, asarHeaderSHA256: hash, files: asar.listPackage(archive).length },
    null,
    2,
  ),
);
console.log('Windows update packaged; executable integrity verified, version ' + version);
