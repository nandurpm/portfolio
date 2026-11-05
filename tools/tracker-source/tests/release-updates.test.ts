import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  TRACKER_RELEASES_API,
  RELEASE_REMINDER_MS,
  compareTrackerVersions,
  latestTrackerUpdate,
  fetchTrackerUpdate,
  isTrustedTrackerUrl,
  isReleaseSnoozed,
  releaseSnoozeRecord,
} from '../src/domain/release-updates';

const makeRelease = (version: string, options: Record<string, unknown> = {}) => ({
  tag_name: 'tracker-v' + version,
  name: 'Savings and Expense Tracker ' + version,
  body: 'Maintenance release',
  draft: false,
  prerelease: false,
  assets: [
    { name: 'Savings-and-Expense-Tracker-' + version + '.apk',
      browser_download_url: 'https://github.com/nandurpm/portfolio/releases/download/tracker-v' + version + '/Savings-and-Expense-Tracker-' + version + '.apk',
      digest: 'sha256:' + 'a'.repeat(64), size: 10000000, state: 'uploaded' },
    { name: 'Savings-and-Expense-Tracker-Setup-' + version + '.exe',
      browser_download_url: 'https://github.com/nandurpm/portfolio/releases/download/tracker-v' + version + '/Savings-and-Expense-Tracker-Setup-' + version + '.exe' },
  ],
  ...options,
});

describe('native Tracker releases', () => {
  it('compares semantic versions without confusing 2.2.10 with 2.2.9', () => {
    expect(compareTrackerVersions('tracker-v2.2.10', '2.2.9')).toBe(1);
    expect(compareTrackerVersions('tracker-v2.2.2', '2.2.2')).toBe(0);
    expect(compareTrackerVersions('tracker-v2.2.1', '2.2.2')).toBe(-1);
    expect(compareTrackerVersions('not-a-tag', '2.2.2')).toBe(0);
  });

  it('selects the latest matching published Tracker release even among unrelated releases', () => {
    const releases = [
      { tag_name: 'electro-v5.1.0', assets: [] },
      makeRelease('2.2.3'),
      makeRelease('2.2.10'),
      makeRelease('2.2.4', { draft: true }),
      makeRelease('2.2.11', { prerelease: true }),
    ];
    expect(latestTrackerUpdate(releases, '2.2.2', 'android')?.version).toBe('2.2.10');
    expect(latestTrackerUpdate(releases, '2.2.2', 'android')?.sha256).toBe('a'.repeat(64));
    expect(latestTrackerUpdate(releases, '2.2.2', 'windows')?.downloadUrl).toContain('Setup-2.2.10.exe');
    expect(latestTrackerUpdate(releases, '2.2.10', 'android')).toBeNull();
  });

  it('rejects missing, mismatched and untrusted assets', () => {
    const asset = makeRelease('2.2.3');
    const altered = { ...asset, assets: [
      { ...asset.assets[0], browser_download_url: 'https://untrusted.example/fake.apk' },
      asset.assets[1],
    ] };
    expect(latestTrackerUpdate([altered], '2.2.2', 'android')).toBeNull();
    expect(latestTrackerUpdate([{ ...asset, assets: [] }], '2.2.2', 'android')).toBeNull();
    expect(latestTrackerUpdate([{ ...asset, assets: [
      { ...asset.assets[0], digest: 'sha256:untrusted' }, asset.assets[1],
    ] }], '2.2.2', 'android')).toBeNull();
    expect(latestTrackerUpdate([{ ...asset, assets: [
      { ...asset.assets[0], digest: undefined }, asset.assets[1],
    ] }], '2.2.2', 'android')).toBeNull();
    expect(latestTrackerUpdate([{ ...asset, assets: [
      { ...asset.assets[0], state: 'new' }, asset.assets[1],
    ] }], '2.2.2', 'android')).toBeNull();
    expect(isTrustedTrackerUrl('https://github.com/nandurpm/portfolio/releases/tag/tracker-v2.2.3')).toBe(true);
    expect(isTrustedTrackerUrl('https://github.com.evil.example/nandurpm/portfolio/releases/tag/tracker-v2.2.3')).toBe(false);
    expect(isTrustedTrackerUrl('http://github.com/nandurpm/portfolio/releases/tag/tracker-v2.2.3')).toBe(false);
  });

  it('fetches the release list and reports API failures for manual checks', async () => {
    const fetched: string[] = [];
    const fakeFetch = (async (url: string) => {
      fetched.push(url);
      return new Response(JSON.stringify([makeRelease('2.2.3')]), { status: 200 });
    }) as typeof fetch;
    expect((await fetchTrackerUpdate('2.2.2', 'android', undefined, fakeFetch))?.version).toBe('2.2.3');
    expect(fetched).toEqual([TRACKER_RELEASES_API]);
    const failed = (async () => new Response('rate limited', { status: 403 })) as typeof fetch;
    await expect(fetchTrackerUpdate('2.2.2', 'android', undefined, failed)).rejects.toThrow('403');
    await expect(fetchTrackerUpdate('2.2.2', 'android', undefined,
      (async () => new Response('{}', { status: 200 })) as typeof fetch)).rejects.toThrow('Invalid');
  });

  it('reminds again after 24 hours, and does not silence new releases', () => {
    const now = 1_800_000_000_000;
    const saved = releaseSnoozeRecord('tracker-v2.2.3', now);
    expect(isReleaseSnoozed(saved, 'tracker-v2.2.3', now + RELEASE_REMINDER_MS - 1)).toBe(true);
    expect(isReleaseSnoozed(saved, 'tracker-v2.2.3', now + RELEASE_REMINDER_MS)).toBe(false);
    expect(isReleaseSnoozed(saved, 'tracker-v2.2.4', now)).toBe(false);
    expect(isReleaseSnoozed('not-json', 'tracker-v2.2.3', now)).toBe(false);
  });

  it('keeps verified in-app APK install isolated from financial storage and external browsers', () => {
    const nativePlugin = readFileSync(new URL('../android/app/src/main/java/com/nandakumar/savingsexpensetracker/TrackerNativePlugin.java', import.meta.url), 'utf8');
    const installer = readFileSync(new URL('../android/app/src/main/java/com/nandakumar/savingsexpensetracker/TrackerApkUpdate.java', import.meta.url), 'utf8');
    const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
    const paths = readFileSync(new URL('../android/app/src/main/res/xml/tracker_update_paths.xml', import.meta.url), 'utf8');
    const ui = readFileSync(new URL('../src/components/ReleaseUpdate.tsx', import.meta.url), 'utf8');
    expect(manifest).toContain('android.permission.REQUEST_INSTALL_PACKAGES');
    expect(manifest).toContain('android:exported="false"');
    expect(manifest).toContain('@xml/tracker_update_paths');
    expect(paths).toContain('path="tracker-updates/"');
    expect(paths).not.toContain('<root-path');
    expect(paths).not.toContain('path="."');
    expect(installer).toContain('getPackageArchiveInfo');
    expect(installer).toContain('getApkContentsSigners');
    expect(installer).toContain('SHA-256');
    expect(installer).toContain('canRequestPackageInstalls');
    expect(installer).toContain('FLAG_GRANT_READ_URI_PERMISSION');
    expect(nativePlugin).toContain('downloadUpdate(PluginCall call)');
    expect(nativePlugin).toContain('installDownloadedUpdate(PluginCall call)');
    expect(ui).toContain('Download & install in app');
    expect(ui).toContain('native.downloadUpdate(');
    expect(ui).toContain('native.installDownloadedUpdate(');
  });

  it('permits the GitHub API in the release build CSP while retaining the Supabase endpoint', () => {
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain("connect-src 'self' __TRACKER_CONNECT_SRC__");
    expect(vite).toContain('https://api.github.com');
    expect(vite).toContain('wss://');
  });
});
