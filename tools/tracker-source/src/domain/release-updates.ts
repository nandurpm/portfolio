/** Release metadata is public; do not access private financial or authentication data here. */
export const TRACKER_RELEASES_API =
  'https://api.github.com/repos/nandurpm/portfolio/releases?per_page=30';
export const CHECK_UPDATES_EVENT = 'tracker:check-for-updates';
export const RELEASE_SNOOZE_KEY = 'tracker-release-remind-after-v2';
export const RELEASE_REMINDER_MS = 24 * 60 * 60 * 1000;

type Asset = { name: string; browser_download_url: string; digest?: string; size?: number; state?: string };
export type TrackerRelease = {
  tag_name: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: Asset[];
};
export type TrackerUpdate = {
  tag: string;
  name: string;
  body: string;
  version: string;
  downloadUrl: string;
  releaseUrl: string;
  /** Official GitHub asset checksum, required to download inside Android. */
  sha256?: string;
};

function parts(value: string): number[] | null {
  const match = /^(?:tracker-)?v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareTrackerVersions(candidate: string, current: string): number {
  const a = parts(candidate), b = parts(current);
  if (!a || !b || a.some((n) => !Number.isSafeInteger(n)) || b.some((n) => !Number.isSafeInteger(n))) return 0;
  for (let i = 0; i < 3; i++) {
    const left = a[i] ?? 0, right = b[i] ?? 0;
    if (left !== right) return left > right ? 1 : -1;
  }
  return 0;
}

export function isTrustedTrackerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://github.com' || parsed.username || parsed.password || parsed.search || parsed.hash) return false;
    if (/^\/nandurpm\/portfolio\/releases\/tag\/tracker-v\d+\.\d+\.\d+$/.test(parsed.pathname)) return true;
    const download = /^\/nandurpm\/portfolio\/releases\/download\/tracker-v(\d+\.\d+\.\d+)\/Savings-and-Expense-Tracker-(Setup-)?(\d+\.\d+\.\d+)\.(apk|exe)$/.exec(parsed.pathname);
    return !!download && download[1] === download[3] &&
      (download[2] === 'Setup-' ? download[4] === 'exe' : download[4] === 'apk');
  } catch {
    return false;
  }
}

export function latestTrackerUpdate(
  releases: unknown,
  installedVersion: string,
  platform: 'android' | 'windows',
): TrackerUpdate | null {
  if (!Array.isArray(releases)) throw Error('Invalid update response');
  const candidates: TrackerUpdate[] = [];
  for (const item of releases) {
    if (!item || typeof item !== 'object') continue;
    const release = item as TrackerRelease;
    if (typeof release.tag_name !== 'string' || release.draft || release.prerelease) continue;
    const match = /^tracker-v(\d+\.\d+\.\d+)$/.exec(release.tag_name);
    if (!match || compareTrackerVersions(release.tag_name, installedVersion) <= 0) continue;
    const releaseVersion = match[1];
    if (!releaseVersion) continue;
    const fileName = platform === 'android'
      ? 'Savings-and-Expense-Tracker-' + releaseVersion + '.apk'
      : 'Savings-and-Expense-Tracker-Setup-' + releaseVersion + '.exe';
    const asset = Array.isArray(release.assets)
      ? release.assets.find((entry) => entry?.name === fileName)
      : undefined;
    const expectedDownload =
      'https://github.com/nandurpm/portfolio/releases/download/' + release.tag_name + '/' + fileName;
    if (!asset || asset.browser_download_url !== expectedDownload || !isTrustedTrackerUrl(expectedDownload)) continue;
    // Native APK installation requires GitHub's trusted asset digest, not only a URL.
    // Older releases without a digest remain available for manual browser downloads.
    const hash = typeof asset.digest === 'string' && /^sha256:([a-f0-9]{64})$/i.test(asset.digest)
      ? asset.digest.slice('sha256:'.length).toLowerCase() : undefined;
    // Both platforms must reference an uploaded, nonempty GitHub asset. Windows
    // opens its installer externally, so it does not require an APK SHA-256 digest.
    if (asset.state !== 'uploaded' || typeof asset.size !== 'number' ||
        !Number.isSafeInteger(asset.size) || asset.size < 1) continue;
    if (platform === 'android' && (!hash || asset.size > 200 * 1024 * 1024)) continue;
    candidates.push({
      tag: release.tag_name,
      version: releaseVersion,
      name: String(release.name || 'Savings and Expense Tracker ' + match[1]).slice(0, 120),
      body: String(release.body || ''),
      downloadUrl: expectedDownload,
      releaseUrl: 'https://github.com/nandurpm/portfolio/releases/tag/' + release.tag_name,
      sha256: hash,
    });
  }
  candidates.sort((a, b) => compareTrackerVersions(b.tag, a.tag));
  return candidates[0] ?? null;
}

export async function fetchTrackerUpdate(
  installedVersion: string,
  platform: 'android' | 'windows',
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<TrackerUpdate | null> {
  const response = await fetcher(TRACKER_RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw Error('GitHub release check failed (' + response.status + ')');
  return latestTrackerUpdate(await response.json(), installedVersion, platform);
}

export function isReleaseSnoozed(saved: string | null, tag: string, now = Date.now()): boolean {
  try {
    const record = saved ? JSON.parse(saved) as { tag?: unknown; until?: unknown } : null;
    return record?.tag === tag && typeof record.until === 'number' &&
      Number.isFinite(record.until) && record.until > now;
  } catch {
    return false;
  }
}

export function releaseSnoozeRecord(tag: string, now = Date.now()): string {
  return JSON.stringify({ tag, until: now + RELEASE_REMINDER_MS });
}
