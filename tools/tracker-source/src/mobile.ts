import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { native } from './native-tracker';
import { envelopeFrom } from './domain/history';
import { freshEnvelope } from './domain/defaults';
import type { Envelope } from './domain/types';
export async function installMobile() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.dataset.platform = 'android';
  window.desktop = {
    platform: 'android',
    oauthOpen: async (url) => {
      await native.openGoogle({ url });
      return null;
    },
    oauthCancel: async () => {},
    async load() {
      const r = await native.load();
      if (!r.text) {
        const e = freshEnvelope();
        await native.save({ text: JSON.stringify(e) });
        return { envelope: e, dataPath: r.dataPath };
      }
      try {
        const envelope = envelopeFrom(JSON.parse(r.text));
        await native.confirmValid({ text: r.text });
        return { envelope, dataPath: r.dataPath };
      } catch {
        await native.preserveCorrupt();
        for (const b of (await native.readBackups()).items) {
          try {
            const envelope = envelopeFrom(JSON.parse(b.text));
            await native.save({ text: JSON.stringify(envelope) });
            return {
              envelope,
              dataPath: r.dataPath,
              warning: `Recovered from ${b.name}. The unreadable original was preserved.`,
            };
          } catch {}
        }
        throw Error(
          'Saved phone data is unreadable. Restore a JSON backup in Reports; editing is paused.',
        );
      }
    },
    save: async (e: Envelope) => {
      envelopeFrom(e);
      await native.save({ text: JSON.stringify(e) });
    },
    sessionGet: async (key) => (await native.sessionGet({ key })).value,
    sessionSet: async (key, value) => native.sessionSet({ key, value }),
    sessionRemove: async (key) => native.sessionRemove({ key }),
    storageStatus: () => native.status(),
    backup: async () => (await native.backup()).path,
    async saveFile(name, bytes, extension) {
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return (await native.saveFile({ name, base64: btoa(binary), extension })).path;
    },
    async openFile(extensions) {
      const r = await native.openFile({ extensions });
      return r
        ? { name: r.name, bytes: Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0)) }
        : null;
    },
    async pdf(html, name) {
      await native.printReport({ html, name });
      return null;
    },
    chooseBackupFolder: async () => {
      throw Error('Use Export full backup to choose a phone folder.');
    },
    openDataFolder: async () => {
      throw Error('Android keeps app files private. Export a JSON backup to save elsewhere.');
    },
    notify: async () => {
      throw Error('Windows reminders are available on the Windows app.');
    },
    version: async () => (await NativeApp.getInfo()).version,
    onBeforeClose: () => () => {},
  };
}
