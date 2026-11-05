import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("desktop", {
  platform: "windows",
  oauthOpen: (url: string) => ipcRenderer.invoke("auth:google", url),
  oauthCancel: () => ipcRenderer.invoke("auth:google-cancel"),
  sessionGet: (key: string) => ipcRenderer.invoke("session:get", key),
  sessionSet: (key: string, value: string) =>
    ipcRenderer.invoke("session:set", key, value),
  sessionRemove: (key: string) => ipcRenderer.invoke("session:remove", key),
  load: () => ipcRenderer.invoke("data:load"),
  save: (e: unknown) => ipcRenderer.invoke("data:save", e),
  saveFile: (name: string, bytes: Uint8Array, extension: string) =>
    ipcRenderer.invoke("file:save", name, bytes, extension),
  openFile: (extensions: string[]) =>
    ipcRenderer.invoke("file:open", extensions),
  chooseBackupFolder: () => ipcRenderer.invoke("backup:folder"),
  backup: () => ipcRenderer.invoke("backup:create"),
  storageStatus: () => ipcRenderer.invoke("data:status"),
  openDataFolder: () => ipcRenderer.invoke("data:folder"),
  notify: (title: string, body: string) =>
    ipcRenderer.invoke("notify", title, body),
  pdf: (html: string, name: string) =>
    ipcRenderer.invoke("report:pdf", html, name),
  version: () => ipcRenderer.invoke("version"),
  openRelease: (url: string) => ipcRenderer.invoke("release:open", url),
  onBeforeClose: (fn: () => Promise<void>) => {
    const handler = () => {
      void fn()
        .then(() => ipcRenderer.send("app:close-ready"))
        .catch((e: Error) => ipcRenderer.send("app:close-failed", e.message));
    };
    ipcRenderer.on("app:before-close", handler);
    return () => ipcRenderer.removeListener("app:before-close", handler);
  },
});
