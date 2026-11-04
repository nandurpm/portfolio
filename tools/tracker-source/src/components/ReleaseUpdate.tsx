import { useEffect, useState } from 'react';
import { version as currentVersion } from '../../package.json';
import { Modal } from './UI';

type Release = { tag_name: string; name: string; html_url: string; body?: string; assets?: { name: string; browser_download_url: string }[] };
const API = 'https://api.github.com/repos/nandurpm/portfolio/releases/latest';
const newer = (candidate: string, current: string) => {
  const parts = (value: string) => value.replace(/^[^0-9]*/, '').split('.').map((part) => Number(part) || 0);
  const a = parts(candidate), b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return false;
};
const platformAsset = (release: Release) => {
  const android = /android/i.test(navigator.userAgent);
  const suffix = android ? '.apk' : '.exe';
  return release.assets?.find((asset) => asset.name.toLowerCase().endsWith(suffix))?.browser_download_url ?? release.html_url;
};

export function ReleaseUpdate() {
  const [release, setRelease] = useState<Release | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Release> : Promise.reject(Error('Release check unavailable')))
      .then((latest) => {
        let dismissed = '';
        try { dismissed = localStorage.getItem('tracker-dismissed-release') ?? ''; } catch { /* Optional preference. */ }
        if (newer(latest.tag_name, currentVersion) && dismissed !== latest.tag_name) setRelease(latest);
      })
      .catch(() => { /* Updating is optional; the tracker must remain fully offline-capable. */ });
    return () => controller.abort();
  }, []);
  if (!release) return null;
  const close = () => { try { localStorage.setItem('tracker-dismissed-release', release.tag_name); } catch { /* Optional preference. */ } setRelease(null); };
  return <Modal title="A tracker update is available" onClose={close}>
    <div className="modal-copy update-release-copy">
      <p><strong>{release.name || release.tag_name}</strong> is newer than your installed version {currentVersion}.</p>
      <p>Your financial records remain in the existing app data location when you install a compatible update.</p>
      {release.body && <p>{release.body.split('\n').find((line) => line.trim() && !line.startsWith('#'))?.slice(0, 240)}</p>}
    </div>
    <div className="modal-actions">
      <button className="button secondary" onClick={close}>Remind me later</button>
      <a className="button" href={platformAsset(release)} target="_blank" rel="noreferrer">Download update</a>
    </div>
  </Modal>;
}
