/** Exercise the transitive APIs affected by issue #41 on synthetic files only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'tracker-dependency-compat-'));
const original = process.cwd();
let checks = 0;
const pass = (name) => {
  checks++;
  console.log(`PASS ${name}`);
};
const portablePaths = (values) => values.map((value) => value.replaceAll("\\", "/"));
try {
  const files = path.join(fixture, 'files');
  await fs.mkdir(path.join(files, 'nested'), { recursive: true });
  await fs.writeFile(path.join(files, 'one.txt'), 'synthetic one');
  await fs.writeFile(path.join(files, 'nested', 'two.txt'), 'synthetic two');
  await fs.writeFile(path.join(files, 'skip.txt'), 'excluded');
  await fs.writeFile(path.join(files, '.hidden.txt'), 'hidden');
  await fs.writeFile(path.join(files, 'main.js'), 'module.exports = "synthetic";');
  await fs.writeFile(path.join(files, 'native.node'), 'synthetic unpacked native placeholder');

  // The scoped bridge preserves these old APIs but uses only patched glob 14.
  const legacyGlob = require('glob');
  assert.equal(legacyGlob.hasMagic('{one,missing}.txt'), true);
  assert.equal(legacyGlob.hasMagic('{one,missing}.txt', { nobrace: true }), false);
  assert.equal(legacyGlob.hasMagic('one.txt'), false);
  assert.deepEqual(portablePaths(legacyGlob.sync('**/*.txt', { cwd: files })).sort(), [
    'nested/two.txt',
    'one.txt',
    'skip.txt',
  ]);
  assert.deepEqual(
    await new Promise((resolve, reject) =>
      legacyGlob('**/*.txt', { cwd: files }, (error, matches) =>
        error ? reject(error) : resolve(portablePaths(matches).sort()),
      ),
    ),
    ['nested/two.txt', 'one.txt', 'skip.txt'],
  );
  assert.deepEqual(legacyGlob.sync('missing-*.txt', { cwd: files, nonull: true }), [
    'missing-*.txt',
  ]);
  assert.deepEqual(legacyGlob.sync('{one,missing}.txt', { cwd: files, nonull: true }), [
    'missing.txt',
    'one.txt',
  ]);
  const signal = AbortSignal.abort(new Error('synthetic cancellation'));
  assert.throws(() => legacyGlob.sync('**/*', { cwd: files, signal }), /synthetic cancellation/);
  await assert.rejects(
    new Promise((resolve, reject) =>
      legacyGlob('**/*', { cwd: files, signal }, (error, matches) =>
        error ? reject(error) : resolve(matches),
      ),
    ),
    /synthetic cancellation/,
  );
  pass('legacy glob callback/sync, recursive, dotfile and nonull behavior');
  const { file } = require('archiver-utils');
  assert.deepEqual(portablePaths(file.expand({ cwd: files }, ['**/*.txt', '!skip.txt'])).sort(), [
    'nested/two.txt',
    'one.txt',
  ]);
  process.chdir(files);
  const { FileList } = require('filelist');
  // filelist's own legacy glob normalizes patterns to backslashes while its
  // recursive scanner normalizes matches to slashes on Windows. Exercise its
  // include/exclude API there; the patched glob bridge is verified above.
  const list =
    process.platform === 'win32'
      ? new FileList('one.txt', 'nested/two.txt', 'skip.txt')
      : new FileList('**/*.txt');
  list.exclude('skip.txt');
  assert.deepEqual(portablePaths(list.toArray()).sort(), ['nested/two.txt', 'one.txt']);
  process.chdir(original);
  pass('archiver-utils exclusions and Jake/FileList pattern API');

  const { FileMatcher } = require('app-builder-lib/out/fileMatcher.js');
  const matcher = new FileMatcher(files, path.join(fixture, 'target'), (value) => value, [
    '**/*',
    '!skip.txt',
  ]);
  const filter = matcher.createFilter();
  assert.equal(
    filter(path.join(files, 'main.js'), await fs.stat(path.join(files, 'main.js'))),
    true,
  );
  assert.equal(
    filter(path.join(files, 'skip.txt'), await fs.stat(path.join(files, 'skip.txt'))),
    false,
  );
  const asar = require('@electron/asar'); // Same CommonJS boundary as electron-builder.
  const archive = path.join(fixture, 'app.asar');
  await asar.createPackageWithOptions(files, archive, { unpack: '*.node' });
  assert.equal(asar.extractFile(archive, 'main.js').toString(), 'module.exports = "synthetic";');
  assert.equal(asar.statFile(archive, 'native.node').unpacked, true);
  assert.equal(
    await fs.readFile(archive + '.unpacked/native.node', 'utf8'),
    'synthetic unpacked native placeholder',
  );
  assert.equal(typeof require('@electron/universal').makeUniversalApp, 'function');
  pass(
    'Electron builder filters, CommonJS/ESM loading, ASAR creation/extraction and native unpack glob',
  );
  if (process.env.TRACKER_WINDOWS_PACKAGE === '1') {
    const { build, Platform } = require('electron-builder');
    const output = path.join(fixture, 'windows');
    await fs.writeFile(
      path.join(files, 'package.json'),
      JSON.stringify({
        name: 'tracker-packaging-smoke',
        version: '0.0.0',
        main: 'main.js',
        description: 'Synthetic issue 41 smoke fixture',
        author: 'Tracker tests',
      }),
    );
    await build({
      targets: Platform.WINDOWS.createTarget('dir'),
      projectDir: root,
      config: {
        appId: 'org.example.tracker.dependencysmoke',
        productName: 'Tracker Packaging Smoke',
        electronVersion: require('electron/package.json').version,
        directories: { app: files, output },
        npmRebuild: false,
        asar: true,
        files: ['main.js', 'package.json'],
        win: { signAndEditExecutable: false },
      },
    });
    await fs.access(path.join(output, 'win-unpacked/Tracker Packaging Smoke.exe'));
    assert.equal(
      asar.extractFile(path.join(output, 'win-unpacked/resources/app.asar'), 'main.js').toString(),
      'module.exports = "synthetic";',
    );
    pass('unsigned Windows Electron directory package and packaged ASAR');
  }

  if (process.env.TRACKER_ELECTRON_SMOKE === '1') {
    const electron = require('electron');
    const runtimeTest = path.join(fixture, 'electron-smoke.cjs');
    await fs.writeFile(
      runtimeTest,
      `const assert = require('node:assert/strict'); assert.ok(process.versions.electron); assert.equal(require(${JSON.stringify(archive + '/main.js')}), 'synthetic'); console.log(JSON.stringify({electron:process.versions.electron,asarLoaded:true}));`,
    );
    const result = spawnSync(electron, [runtimeTest], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    console.log(result.stdout.trim());
    pass('actual Electron runtime loads the generated ASAR');
  }

  const archiver = require('archiver');
  const zip = archiver('zip');
  const buffers = [];
  zip.on('data', (buffer) => buffers.push(buffer));
  const completed = new Promise((resolve, reject) => {
    zip.on('end', resolve);
    zip.on('error', reject);
  });
  zip.glob('**/*.txt', { cwd: files, ignore: 'skip.txt' });
  await zip.finalize();
  await completed;
  const unzipper = require('unzipper');
  const contents = await unzipper.Open.buffer(Buffer.concat(buffers));
  assert.deepEqual(contents.files.map((entry) => entry.path).sort(), ['nested/two.txt', 'one.txt']);
  assert.equal(
    (await contents.files.find((entry) => entry.path === 'one.txt').buffer()).toString(),
    'synthetic one',
  );
  const ExcelJS = require('exceljs');
  const xlsx = path.join(fixture, 'synthetic.xlsx');
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: xlsx });
  const sheet = writer.addWorksheet('Round trip');
  sheet.addRow(['Receipt', 'Amount', 'Formula']).commit();
  sheet.addRow(['synthetic-receipt-₹', 123.45, { formula: 'B2*2', result: 246.9 }]).commit();
  await writer.commit();
  const reader = new ExcelJS.Workbook();
  await reader.xlsx.readFile(xlsx);
  assert.equal(reader.worksheets[0].getCell('A2').value, 'synthetic-receipt-₹');
  assert.equal(reader.worksheets[0].getCell('B2').value, 123.45);
  assert.deepEqual(reader.worksheets[0].getCell('C2').value, { formula: 'B2*2', result: 246.9 });
  pass('archive glob ZIP round trip and streaming Excel XLSX/formula/Unicode round trip');

  const cap = path.join(fixture, 'capacitor');
  await fs.mkdir(path.join(cap, 'www'), { recursive: true });
  await fs.writeFile(
    path.join(cap, 'www/index.html'),
    '<!doctype html><html><body>Synthetic fixture</body></html>',
  );
  await fs.writeFile(
    path.join(cap, 'package.json'),
    JSON.stringify({
      name: 'tracker-native-smoke',
      version: '0.0.0',
      private: true,
      dependencies: {
        '@capacitor/core': '8.5.3',
        '@capacitor/android': '8.5.3',
        '@capacitor/app': '8.1.2',
      },
    }),
  );
  await fs.symlink(path.join(root, 'node_modules'), path.join(cap, 'node_modules'), 'junction');
  const cli = require.resolve('@capacitor/cli/bin/capacitor');
  for (const args of [
    ['init', 'Tracker dependency smoke', 'org.example.tracker.dependencysmoke', '--web-dir', 'www'],
    ['add', 'android'],
    ['sync', 'android'],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: cap, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
  }
  assert.ok(
    (
      await fs.readFile(path.join(cap, 'android/app/src/main/assets/public/index.html'), 'utf8')
    ).includes('Synthetic fixture'),
  );
  pass('Capacitor Android template generation, web copy and native plugin synchronization');
  // Opt in only on machines with the Android SDK; the fixture has no signing key.
  if (process.env.TRACKER_ANDROID_COMPILE === '1') {
    const result = spawnSync(path.join(cap, 'android/gradlew'), ['--no-daemon', 'assembleDebug'], {
      cwd: path.join(cap, 'android'),
      encoding: 'utf8',
      timeout: 600000,
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    await fs.access(path.join(cap, 'android/app/build/outputs/apk/debug/app-debug.apk'));
    pass('disposable Android debug APK compilation');
  }
  console.log(
    `${checks} dependency compatibility groups passed. No user records or release signing keys used.`,
  );
} finally {
  process.chdir(original);
  await fs.rm(fixture, { recursive: true, force: true });
}
