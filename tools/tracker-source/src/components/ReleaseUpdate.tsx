import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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

  if (!available || WEB_APP) return null;
  const { update, installed } = available;
  const remindTomorrow = () => {
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

  return <Modal title="A tracker update is available" onClose={remindTomorrow}>
    <div className="modal-copy update-release-copy">
      <p><strong>{update.name}</strong> (v{update.version}) is newer than your installed version {installed}.</p>
      <p>Export a full JSON backup and sync any pending edits before updating. Install over the existing app; do not uninstall it.</p>
      {summary && <p>{summary.slice(0, 240)}</p>}
      <p className="muted">The update opens in your external browser. Financial data is not sent to GitHub.</p>
    </div>
    <div className="modal-actions">
      <button className="button secondary" onClick={remindTomorrow}>Remind me tomorrow</button>
      <button className="button secondary" onClick={() => void openOfficialUrl(update.releaseUrl)}>Release notes</button>
      <button className="button" onClick={() => void openOfficialUrl(update.downloadUrl)}>Download update</button>
    </div>
  </Modal>;
}
