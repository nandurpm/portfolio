import { registerPlugin } from '@capacitor/core';

// Share one plugin proxy across mobile storage and Android system-bar helpers.
interface NativeTracker {
  setBarBackgrounds(colors: { topColor: string; bottomColor: string }): Promise<void>;
  openGoogle(o: { url: string }): Promise<void>;
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
