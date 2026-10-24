import { it, expect, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalStore } from '../electron/storage';
import { freshEnvelope } from '../src/domain/defaults';
const dirs: string[] = [];
afterEach(async () => {
  for (const p of dirs.splice(0)) await fs.rm(p, { recursive: true, force: true });
});
async function disk() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'savings-tracker-test-'));
  dirs.push(dir);
  return new LocalStore(dir);
}
it('serializes concurrent atomic saves and loads the last valid one', async () => {
  const d = await disk();
  expect((await d.load()).envelope).toBeNull();
  const a = freshEnvelope(),
    b = freshEnvelope();
  b.data.settings.opening = 1200;
  await Promise.all([d.save(a), d.save(b)]);
  expect((await d.load()).envelope!.data.settings.opening).toBe(1200);
  expect(await fs.readdir(d.folder)).not.toContain('plan.json.tmp');
});
it('keeps only ten exit backups and recovers a corrupt primary file', async () => {
  const d = await disk();
  await d.save(freshEnvelope());
  for (let i = 0; i < 13; i++) await d.backup();
  const files = await fs.readdir(path.join(d.folder, 'backups'));
  expect(files).toHaveLength(10);
  await fs.writeFile(d.filename, 'broken json');
  const recovery = await new LocalStore(d.folder).load();
  expect(recovery.envelope!.data.settings.opening).toBe(0);
  expect(recovery.warning).toContain('Recovered');
  expect((await fs.readdir(d.folder)).some((x) => x.startsWith('plan-corrupt-'))).toBe(true);
});
it('does not replace an unreadable file when no valid backup exists', async () => {
  const d = await disk();
  await fs.writeFile(d.filename, 'original broken data');
  await expect(d.load()).rejects.toThrow('unreadable');
  expect(await fs.readFile(d.filename, 'utf8')).toBe('original broken data');
});

it('reports save and backup timestamps across restarts without creating a backup', async () => {
  const d = await disk();
  expect(await d.storageStatus()).toEqual({ lastSavedAt: '', lastBackupAt: '' });
  await d.save(freshEnvelope());
  expect((await d.storageStatus()).lastSavedAt).not.toBe('');
  expect((await d.storageStatus()).lastBackupAt).toBe('');
  await d.backup();
  const status = await new LocalStore(d.folder).storageStatus();
  expect(Number.isFinite(Date.parse(status.lastSavedAt))).toBe(true);
  expect(Number.isFinite(Date.parse(status.lastBackupAt))).toBe(true);
});
