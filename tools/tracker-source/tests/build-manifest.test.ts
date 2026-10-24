import { it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
it('detects a changed build asset rather than accepting a stale manifest', async () => {
  const { verifyBuild } = await import('../scripts/verify-build.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'tracker-manifest-'));
  try {
    const files = { 'index.html': '<html>fixture</html>', 'app.js': 'fixture' };
    const hashes = Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, createHash('sha256').update(v).digest('hex')]),
    );
    await Promise.all(Object.entries(files).map(([k, v]) => writeFile(join(dir, k), v)));
    await writeFile(
      join(dir, 'build.json'),
      JSON.stringify({
        mode: 'web',
        requiresSignIn: true,
        sourceCommit: 'a'.repeat(40),
        sourceTree: execFileSync('git', ['rev-parse', 'HEAD:tools/tracker-source'], {
          encoding: 'utf8',
        }).trim(),
        dirty: false,
        files: hashes,
      }),
    );
    await expect(verifyBuild(dir)).resolves.toHaveProperty('sourceCommit');
    await writeFile(join(dir, 'app.js'), 'changed');
    await expect(verifyBuild(dir)).rejects.toThrow('checksum mismatch');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
