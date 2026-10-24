import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = process.argv.includes('--release');
if (release && (!process.env.TRACKER_KEYSTORE_PATH || !process.env.TRACKER_KEYSTORE_PASSWORD)) {
  console.error(
    'Release builds require TRACKER_KEYSTORE_PATH and TRACKER_KEYSTORE_PASSWORD. Use your private signing backup; never commit the key or password.',
  );
  process.exit(1);
}
const result = spawnSync(
  process.platform === 'win32' ? 'gradlew.bat' : 'bash',
  process.platform === 'win32'
    ? ['clean', release ? 'assembleRelease' : 'assembleDebug']
    : [path.join(root, 'android/gradlew'), 'clean', release ? 'assembleRelease' : 'assembleDebug'],
  {
    cwd: path.join(root, 'android'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  },
);
process.exit(result.status ?? 1);
