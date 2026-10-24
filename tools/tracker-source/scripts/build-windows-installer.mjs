import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
const project = process.cwd();
const runtime = process.argv[2] || path.join(project, 'release', 'win-unpacked');
const output = process.argv[3] || path.join(project, 'release', 'installers');
const installDir =
  process.argv[4] || path.join(process.env.LOCALAPPDATA, 'Programs', 'Savings and Expense Tracker');
// Build the Electron runtime from dependencies; no previous installed app is required.
if (!process.argv[2]) {
  const builder = path.join(project, 'node_modules', 'electron-builder', 'cli.js');
  const result = spawnSync(process.execPath, [builder, '--win', '--dir'], {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
  });
  if (result.status !== 0) throw Error('Windows runtime build failed');
}
const compiler =
  process.env.INNO_COMPILER ||
  path.join(process.env.LOCALAPPDATA, 'Programs', 'Inno Setup 6', 'ISCC.exe');
await fs.access(compiler);
const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
await fs.mkdir(output, { recursive: true });
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'tracker-installer-'));
const staged = path.join(temporary, 'app'),
  update = path.join(temporary, 'update');
await fs.cp(runtime, staged, {
  recursive: true,
  filter: (source) => !/^unins\d*\.(exe|dat|msg)$/i.test(path.basename(source)),
});
const packed = spawnSync(process.execPath, ['scripts/package-installed.mjs', runtime, update], {
  stdio: 'inherit',
  windowsHide: true,
});
if (packed.status !== 0) throw Error('Application packaging failed');
await fs.copyFile(
  path.join(update, 'Savings and Expense Tracker.exe'),
  path.join(staged, 'Savings and Expense Tracker.exe'),
);
await fs.copyFile(
  path.join(update, 'resources', 'app.asar'),
  path.join(staged, 'resources', 'app.asar'),
);
// Finish compiler resource updates outside OneDrive/file-sync watchers before publishing.
const compiled = path.join(temporary, 'installer');
await fs.mkdir(compiled, { recursive: true });
const args = [`/DAppSource=${staged}`, `/DAppVersion=${version}`, `/O${compiled}`];
if (installDir) args.push(`/DInstallDir=${path.resolve(installDir)}`);
args.push(path.resolve('build/windows-installer.iss'));
const result = spawnSync(compiler, args, { stdio: 'inherit', windowsHide: true });
if (result.status !== 0) throw Error('Windows installer compilation failed');
await fs.copyFile(
  path.join(compiled, 'Savings-and-Expense-Tracker-Setup.exe'),
  path.join(output, 'Savings-and-Expense-Tracker-Setup.exe'),
);
if (!path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep))
  throw Error('Unexpected temporary build path');
await fs.rm(temporary, { recursive: true, force: true });
