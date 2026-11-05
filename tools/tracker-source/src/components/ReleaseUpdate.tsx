import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { version as packagedVersion } from '../../package.json';
import { WEB_APP } from '../web-mode';
import { native } from '../native-tracker';
import {
  CHECK_UPDATES_EVENT,
  RELEASE_SNOOZE_KEY,
  fetchTrackerUpdate,
  isReleaseSnoozed,
  releaseSnoozeRecord,
  type TrackerUpdate,
} from '../domain/release-updates';
import { Modal, useUi } from './UI';

const RESUME_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function ReleaseUpdate() {
  const [available, setAvailable] = useState<{ update: TrackerUpdate; installed: string } | null>(null);
  const { toast } = useUi();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [installHint, setInstallHint] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const isAndroid = Capacitor.getPlatform() === 'android';
  const lastAutoCheck = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const checkRef = useRef<(manual: boolean) => void>(() => {});

  checkRef.current = (manual: boolean) => {
    void (async () => {
      if (WEB_APP || (!manual && Date.now() - lastAutoCheck.current < RESUME_CHECK_INTERVAL_MS)) return;
      lastAutoCheck.current = Date.now();
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      try {
        // Native application version is authoritative; the source package is a safe fallback.
        const installed = await window.desktop?.version?.().catch(() => packagedVersion) ?? packagedVersion;
        if (controller.signal.aborted) return;
        const platform = Capacitor.getPlatform() === 'android' ? 'android' : 'windows';
        const update = await fetchTrackerUpdate(installed, platform, controller.signal);
        if (controller.signal.aborted) return;
        if (!update) {
          setAvailable(null);
          if (manual) toast('You are using the latest available Tracker version (' + installed + ').');
          return;
        }
        let saved: string | null = null;
        try { saved = localStorage.getItem(RELEASE_SNOOZE_KEY); } catch { /* Device preference is optional. */ }
        if (manual || !isReleaseSnoozed(saved, update.tag)) {
          setAvailable({ update, installed });
        }
      } catch {
        if (controller.signal.aborted) return;
        // Automatic checks never interrupt offline finance workflows.
        lastAutoCheck.current = 0;
        if (manual) toast('Unable to check for updates. Check your internet connection and try again.', true);
      } finally {
        if (pending.current === controller) pending.current = null;
      }
    })();
  };

  useEffect(() => {
    if (WEB_APP) return;
    checkRef.current(false);
    const manual = () => checkRef.current(true);
    const resume = () => { if (!document.hidden) checkRef.current(false); };
    window.addEventListener(CHECK_UPDATES_EVENT, manual);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    let disposed = false;
    let stopNative: (() => void) | null = null;
    if (Capacitor.getPlatform() === 'android') {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) checkRef.current(false);
      }).then((listener) => {
        if (disposed) void listener.remove();
        else stopNative = () => { void listener.remove(); };
      }).catch(() => { /* Browser lifecycle still handles foreground checks. */ });
    }
    return () => {
      disposed = true;
      pending.current?.abort();
      stopNative?.();
      window.removeEventListener(CHECK_UPDATES_EVENT, manual);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  const update = available?.update;
  useEffect(() => {
    setDownloaded(false);
    setInstallHint('');
    setDownloadError('');
    setDownloadPercent(null);
    if (!isAndroid || !update?.sha256) return;
    let active = true;
    void native.isUpdateDownloaded({ version: update.version, sha256: update.sha256 })
      .then(({ ready }) => { if (active) setDownloaded(ready); })
      .catch(() => { /* No cached APK. Download remains available. */ });
    return () => { active = false; };
  }, [isAndroid, update?.tag, update?.sha256]);

  const installDownloaded = async () => {
    if (!available || !available.update.sha256) return;
    try {
      setDownloadError('');
      const result = await native.installDownloadedUpdate({
        version: available.update.version,
        sha256: available.update.sha256,
      });
      setInstallHint(result.permissionRequired
        ? 'Android opened Install unknown apps. Allow installs from Tracker, return here, then tap Install downloaded update.'
        : 'Confirm the update in Android’s system installer. Your saved data stays in place.');
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Could not open the Android installer.');
    }
  };

  const downloadInsideApp = async () => {
    if (!available || downloading || !available.update.sha256) return;
    if (downloaded) { await installDownloaded(); return; }
    setDownloading(true);
    setDownloadError('');
    setInstallHint('');
    setDownloadPercent(null);
    let listener: PluginListenerHandle | undefined;
    try {
      listener = await native.addListener('trackerUpdateProgress', ({ percent }) => {
        setDownloadPercent(percent >= 0 ? percent : null);
      });
      await native.downloadUpdate({
        version: available.update.version,
        sha256: available.update.sha256,
        url: available.update.downloadUrl,
      });
      setDownloaded(true);
      setDownloadPercent(100);
      const result = await native.installDownloadedUpdate({
        version: available.update.version,
        sha256: available.update.sha256,
      });
      setInstallHint(result.permissionRequired
        ? 'Allow installs from Tracker on the Android screen, return here and tap Install downloaded update.'
        : 'Confirm Update in Android’s installer to keep the existing app and financial records.');
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Update download or installation failed.');
      // The download can be valid even when the installer was blocked by permissions.
      try {
        const { ready } = await native.isUpdateDownloaded({
          version: available.update.version,
          sha256: available.update.sha256,
        });
        setDownloaded(ready);
      } catch { /* Retry download if verification is unavailable. */ }
    } finally {
      if (listener) await listener.remove().catch(() => {});
      setDownloading(false);
    }
  };

  if (!available || WEB_APP) return null;
  const { update, installed } = available;
  const remindTomorrow = () => {
    if (downloading) return;
    try { localStorage.setItem(RELEASE_SNOOZE_KEY, releaseSnoozeRecord(update.tag)); }
    catch { /* A non-persistent reminder must never block the app. */ }
    setAvailable(null);
  };
  const openOfficialUrl = async (url: string) => {
    try {
      if (Capacitor.getPlatform() === 'android') await native.openRelease({ url });
      else if (window.desktop?.openRelease) await window.desktop.openRelease(url);
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast('Unable to open the official release in your browser. Please use GitHub Releases.', true);
    }
  };
  const summary = update.body.split('\n').map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith(String.fromCharCode(96)));

  return <Modal title="A tracker update is available" onClose={downloading ? () => {} : remindTomorrow}>
    <div className="modal-copy update-release-copy">
      <p><strong>{update.name}</strong> (v{update.version}) is newer than your installed version {installed}.</p>
      <p>Export a full JSON backup and sync any pending edits before updating. Install over the existing app; do not uninstall it.</p>
      {summary && <p>{summary.slice(0, 240)}</p>}
      {isAndroid ? <>
        <p className="muted">Download the official APK inside Tracker. Android will still ask you to approve installation.</p>
        {downloading && <div className="tracker-update-download" role="status">
          <span>{downloadPercent === null ? 'Downloading verified APK…' : 'Downloading APK: ' + downloadPercent + '%'}</span>
          <progress max={100} value={downloadPercent === null ? undefined : downloadPercent} aria-label="APK download progress" />
        </div>}
        {downloadError && <p className="update-error" role="alert">{downloadError}</p>}
        {installHint && <p role="status">{installHint}</p>}
      </> : <p className="muted">The Windows installer opens in your external browser. Financial data is not sent to GitHub.</p>}
    </div>
    <div className="modal-actions">
      <button className="button secondary" disabled={downloading} onClick={remindTomorrow}>Remind me tomorrow</button>
      <button className="button secondary" disabled={downloading} onClick={() => void openOfficialUrl(update.releaseUrl)}>Release notes</button>
      {isAndroid
        ? <button className="button" disabled={downloading || !update.sha256}
            onClick={() => void downloadInsideApp()}>
            {downloading ? 'Downloading…' : downloaded ? 'Install downloaded update' : 'Download & install in app'}
          </button>
        : <button className="button" onClick={() => void openOfficialUrl(update.downloadUrl)}>Download update</button>}
    </div>
  </Modal>;
}
