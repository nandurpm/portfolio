import type { Envelope } from './domain/types';
export {};
declare global {
  interface Window {
    desktop?: {
      platform?: 'windows' | 'android';
      oauthOpen?: (url: string) => Promise<string | null>;
      oauthCancel?: () => Promise<void>;
      sessionGet?: (key: string) => Promise<string | null>;
      sessionSet?: (key: string, value: string) => Promise<void>;
      sessionRemove?: (key: string) => Promise<void>;
      load: () => Promise<{ envelope: Envelope | null; warning?: string; dataPath: string }>;
      save: (data: Envelope) => Promise<void>;
      saveFile: (name: string, bytes: Uint8Array, extension: string) => Promise<string | null>;
      openFile: (extensions: string[]) => Promise<{ name: string; bytes: Uint8Array } | null>;
      chooseBackupFolder: () => Promise<string | null>;
      backup: () => Promise<string>;
      storageStatus: () => Promise<{ lastSavedAt: string; lastBackupAt: string }>;
      openDataFolder: () => Promise<void>;
      notify: (title: string, body: string) => Promise<void>;
      pdf: (html: string, name: string) => Promise<string | null>;
      onBeforeClose: (fn: () => Promise<void>) => () => void;
      version: () => Promise<string>;
    };
  }
}
