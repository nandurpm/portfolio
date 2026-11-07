import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { WidgetTransport } from './widgets/coordinator';

// Share one plugin proxy across mobile storage and Android system-bar helpers.
interface NativeTracker extends WidgetTransport {
  setBarBackgrounds(colors: { topColor: string; bottomColor: string }): Promise<void>;
  feedback(o: { kind: 'expense' | 'budget' | 'reminder' | 'success' }): Promise<void>;
  notify(o: { title: string; body: string; kind?: 'reminder' | 'success' }): Promise<void>;
  openGoogle(o: { url: string }): Promise<void>;
  openRelease(o: { url: string }): Promise<void>;
  /** Verified, private APK download. The native installer always requires user confirmation. */
  isUpdateDownloaded(o: { version: string; sha256: string }): Promise<{ ready: boolean }>;
  downloadUpdate(o: { version: string; sha256: string; url: string }): Promise<{ ready: boolean }>;
  installDownloadedUpdate(o: { version: string; sha256: string }): Promise<{ launched: boolean; permissionRequired: boolean }>;
  addListener(eventName: 'trackerUpdateProgress',
    listener: (event: { received: number; total: number; percent: number }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'trackerWidgetAction', listener: () => void): Promise<PluginListenerHandle>;
  load(): Promise<{ text: string | null; dataPath: string }>;
  save(o: { text: string }): Promise<void>;
  confirmValid(o: { text: string }): Promise<void>;
  preserveCorrupt(): Promise<void>;
  readBackups(): Promise<{ items: { name: string; text: string }[] }>;
  backup(): Promise<{ path: string }>;
  status(): Promise<{ lastSavedAt: string; lastBackupAt: string }>;
  sessionGet(o: { key: string }): Promise<{ value: string | null }>;
  sessionSet(o: { key: string; value: string }): Promise<void>;
  sessionRemove(o: { key: string }): Promise<void>;
  saveFile(o: {
    name: string;
    base64: string;
    extension: string;
  }): Promise<{ path: string | null }>;
  openFile(o: { extensions: string[] }): Promise<{ name: string; base64: string } | null>;
  printReport(o: { html: string; name: string }): Promise<void>;
}
export const native = registerPlugin<NativeTracker>('TrackerNative');
