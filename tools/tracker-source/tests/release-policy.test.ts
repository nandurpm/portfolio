import { it, expect } from 'vitest';
import JSZip from 'jszip';
import { assertPublicPath, checkArchive } from '../scripts/release-policy.mjs';
it('blocks private material even inside a nested backup archive', async () => {
  for (const name of [
    'Private-Data-Backup/plan.json',
    'Private-Android-Signing/key.jks',
    'a/password.txt',
    'a/release.keystore',
  ])
    expect(() => assertPublicPath(name)).toThrow('blocked');
  const inner = new JSZip();
  inner.file('password.txt', 'test');
  const outer = new JSZip();
  outer.file('safe-name.zip', await inner.generateAsync({ type: 'uint8array' }));
  await expect(checkArchive(outer)).rejects.toThrow('blocked');
});
it('accepts an empty public template and ordinary application files', async () => {
  const zip = new JSZip();
  zip.file('Web/track/index.html', 'login');
  zip.file('Web/track/release.json', '{"version":"test"}');
  await expect(checkArchive(zip)).resolves.toBeUndefined();
});
