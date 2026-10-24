import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Notification,
  Tray,
  Menu,
  nativeImage,
  protocol,
  net,
  shell,
  session,
  safeStorage,
} from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { openGoogleOAuth, cancelGoogleOAuth } from "./google-oauth";
import { LocalStore } from "./storage";
import { sessionPath } from "./session-path";
import { APP_NAME, LEGACY_APP_NAME, type Envelope } from "../src/domain/types";
import { freshEnvelope } from "../src/domain/defaults";
import { today, inRange, daysIn } from "../src/domain/dates";
app.setName(APP_NAME);
// Existing installs keep their data in %APPDATA%\Savings and Expence Tracker. Pin that folder so the
// spelling fix never makes the app look empty.
app.setPath("userData", path.join(app.getPath("appData"), LEGACY_APP_NAME));
// Explicit local override for isolated acceptance tests and portable data directories.
if (process.env.TRACKER_USER_DATA)
  app.setPath("userData", path.resolve(process.env.TRACKER_USER_DATA));
app.setAppUserModelId("com.nandakumar.savingsandexpencetracker");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "tracker",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
let win: BrowserWindow | null = null,
  tray: Tray | null = null,
  quitting = false,
  closing = false;
let disk: LocalStore;
const dev = process.env.VITE_DEV_SERVER_URL;
const root = path.resolve(__dirname, "..");
const allowed = (
  event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent,
) => {
  const url = event.senderFrame?.url ?? "";
  if (
    event.sender !== win?.webContents ||
    !(url.startsWith("tracker://app/") || (dev && url.startsWith(dev)))
  )
    throw Error("Untrusted request");
};
function handle(name: string, fn: (...args: any[]) => unknown) {
  ipcMain.handle(name, (event, ...args) => {
    allowed(event);
    return fn(...args);
  });
}
let configuredAutoStart: boolean | undefined;
function configure(e: Envelope) {
  if (
    process.platform === "win32" &&
    app.isPackaged &&
    configuredAutoStart !== e.data.settings.autoStart
  ) {
    app.setLoginItemSettings({
      openAtLogin: e.data.settings.autoStart,
      path: process.execPath,
      args: ["--background"],
    });
    configuredAutoStart = e.data.settings.autoStart;
  }
  if (e.data.settings.tray && !tray) {
    tray = new Tray(
      nativeImage
        .createFromPath(path.join(root, "build/icon.png"))
        .resize({ width: 24, height: 24 }),
    );
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open Savings and Expense Tracker",
          click: () => {
            win?.show();
            win?.focus();
          },
        },
        { type: "separator" },
        { label: "Quit", click: () => requestClose(true) },
      ]),
    );
    tray.on("double-click", () => win?.show());
  } else if (!e.data.settings.tray && tray) {
    tray.destroy();
    tray = null;
  }
}
async function finishClose() {
  cancelGoogleOAuth();
  try {
    await disk.flush();
    if (disk.latest) await disk.backup();
    quitting = true;
    tray?.destroy();
    app.quit();
  } catch (e) {
    closing = false;
    void dialog.showMessageBox(win!, {
      type: "error",
      title: APP_NAME,
      message: "Could not finish saving or backing up.",
      detail: String(e),
      buttons: ["Keep app open"],
    });
  }
}
function requestClose(force = false) {
  if (closing || quitting) return;
  if (!force && disk.latest?.data.settings.tray) {
    win?.hide();
    return;
  }
  closing = true;
  win?.webContents.send("app:before-close");
}
function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 800,
    minHeight: 560,
    title: APP_NAME,
    backgroundColor: "#f5f5fc",
    show: false,
    icon: path.join(root, "build/icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("tracker://app/") && !(dev && url.startsWith(dev)))
      e.preventDefault();
  });
  win.once("ready-to-show", () => {
    if (
      !process.argv.includes("--background") ||
      !disk.latest?.data.settings.tray
    )
      win?.show();
  });
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      requestClose();
    }
  });
  if (dev) void win.loadURL(dev);
  else void win.loadURL("tracker://app/index.html");
}
async function reminders() {
  const p = disk.latest?.data;
  if (!p) return;
  const date = today(),
    day = +date.slice(8, 10);
  if (!inRange(date, p.settings.planStart, p.settings.planEnd)) return;
  const h = new Date().getHours(),
    enabled = p.settings.reminders;
  const items: [string, boolean, string][] = [
    [
      "salary",
      enabled.salary &&
        day === Math.min(p.settings.salaryDay, daysIn(date.slice(0, 7))) &&
        h >= 9,
      "Salary is expected today. Add it to Daily Entries when received.",
    ],
    [
      "emi",
      enabled.emi &&
        [
          ...p.loan.rows,
          ...(p.additionalLoans ?? []).flatMap((l) => l.rows),
        ].some(
          (r) =>
            r.dueDate === date &&
            !r.paid &&
            ((p.additionalLoans ?? []).some((l) =>
              l.rows.some((x) => x.id === r.id),
            ) ||
              p.settings.mode !== "Early closure" ||
              r.month <= p.settings.closureMonth),
        ) &&
        h >= 8,
      "Your EMI is due today. Keep the money ready before salary arrives.",
    ],
    [
      "recharge",
      enabled.recharge &&
        p.categories.some(
          (c) =>
            (c.id === "mobile" || c.name.toLowerCase().includes("recharge")) &&
            c.active &&
            c.timing === "Fixed day" &&
            (!c.months.length || c.months.includes(+date.slice(5, 7))) &&
            c.day === day &&
            !p.entries.some((e) => e.categoryId === c.id && e.date === date),
        ) &&
        h >= 9,
      "Mobile recharge is due today.",
    ],
    [
      "missing",
      enabled.missing && h >= 21 && !p.entries.some((e) => e.date === date),
      "No entries recorded today. Take a moment to update your expenses.",
    ],
  ];
  const file = path.join(app.getPath("userData"), "reminders.json");
  let sent: Record<string, string> = {};
  try {
    sent = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  for (const [key, show, body] of items)
    if (show && sent[key] !== date && Notification.isSupported()) {
      new Notification({
        title: APP_NAME,
        body,
        icon: path.join(root, "build/icon.png"),
      }).show();
      sent[key] = date;
    }
  await fs.writeFile(file, JSON.stringify(sent));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    win?.show();
    win?.focus();
  });
  void app.whenReady().then(async () => {
    disk = new LocalStore(app.getPath("userData"));
    protocol.handle("tracker", (request) => {
      const url = new URL(request.url);
      const requested = decodeURIComponent(
        url.pathname === "/" ? "/index.html" : url.pathname,
      );
      const target = path.resolve(root, "dist", "." + requested),
        base = path.join(root, "dist");
      if (url.hostname !== "app" || !target.startsWith(base + path.sep))
        return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(target).toString());
    });
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) =>
      cb(false),
    );
    handle("data:load", async () => {
      const result = await disk.load();
      if (!result.envelope) {
        const first = freshEnvelope();
        await disk.save(first);
        result.envelope = first;
      }
      configure(result.envelope);
      return { ...result, dataPath: disk.filename };
    });
    handle("data:save", async (e: Envelope) => {
      await disk.save(e);
      configure(e);
    });
    handle(
      "file:save",
      async (name: string, bytes: Uint8Array, ext: string) => {
        if (
          !["xlsx", "csv", "json", "pdf"].includes(ext) ||
          bytes.byteLength > 150 * 1024 * 1024
        )
          throw Error("Unsupported export");
        const result = await dialog.showSaveDialog(win!, {
          title: APP_NAME,
          defaultPath: path.basename(name),
          filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
        });
        if (result.canceled || !result.filePath) return null;
        await fs.writeFile(result.filePath, Buffer.from(bytes));
        return result.filePath;
      },
    );
    handle("file:open", async (exts: string[]) => {
      if (
        !Array.isArray(exts) ||
        exts.some((x) => !["xlsx", "csv", "json"].includes(x))
      )
        throw Error("Unsupported import type");
      const result = await dialog.showOpenDialog(win!, {
        title: APP_NAME,
        properties: ["openFile"],
        filters: [{ name: "Supported files", extensions: exts }],
      });
      if (result.canceled) return null;
      const file = result.filePaths[0];
      if (!file) return null;
      if ((await fs.stat(file)).size > 100 * 1024 * 1024)
        throw Error("Choose a file smaller than 100 MB.");
      return {
        name: path.basename(file),
        bytes: new Uint8Array(await fs.readFile(file)),
      };
    });
    handle("backup:folder", async () => {
      const r = await dialog.showOpenDialog(win!, {
        properties: ["openDirectory", "createDirectory"],
      });
      return r.canceled ? null : r.filePaths[0];
    });
    handle("backup:create", () => disk.backup());
    handle("data:status", () => disk.storageStatus());
    handle("data:folder", () => shell.openPath(app.getPath("userData")));
    handle("notify", (title: string, body: string) => {
      if (Notification.isSupported())
        new Notification({
          title: String(title).slice(0, 100),
          body: String(body).slice(0, 500),
        }).show();
    });
    handle("auth:google", (url: string) =>
      openGoogleOAuth(
        url,
        (u) => shell.openExternal(u),
        () => {
          win?.show();
          win?.focus();
        },
      ),
    );
    handle("auth:google-cancel", () => cancelGoogleOAuth());
    handle("session:get", async (key: string) => {
      const file = sessionPath(app.getPath("userData"), key);
      try {
        return safeStorage.decryptString(await fs.readFile(file));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        await fs
          .rename(file, file + ".unreadable-" + Date.now())
          .catch(() => {});
        return null;
      }
    });
    handle("session:set", async (key: string, value: string) => {
      const file = sessionPath(app.getPath("userData"), key);
      if (!safeStorage.isEncryptionAvailable())
        throw Error("Secure session storage is unavailable.");
      if (typeof value !== "string" || value.length > 100000)
        throw Error("Invalid session");
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file + ".tmp", safeStorage.encryptString(value), {
        mode: 0o600,
      });
      await fs.rename(file + ".tmp", file);
    });
    handle("session:remove", async (key: string) => {
      await fs.rm(sessionPath(app.getPath("userData"), key), { force: true });
    });
    handle("version", () => app.getVersion());
    handle("report:pdf", async (html: string, name: string) => {
      if (typeof html !== "string" || html.length > 5_000_000)
        throw Error("Report is too large");
      const result = await dialog.showSaveDialog(win!, {
        title: APP_NAME,
        defaultPath: path.basename(name),
        filters: [{ name: "PDF report", extensions: ["pdf"] }],
      });
      if (result.canceled || !result.filePath) return null;
      const report = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true,
          nodeIntegration: false,
          contextIsolation: true,
          javascript: false,
        },
      });
      try {
        await report.loadURL(
          "data:text/html;charset=UTF-8," + encodeURIComponent(html),
        );
        const bytes = await report.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
          margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        });
        await fs.writeFile(result.filePath, bytes);
        return result.filePath;
      } finally {
        report.destroy();
      }
    });
    ipcMain.on("app:close-ready", (event) => {
      allowed(event);
      void finishClose();
    });
    ipcMain.on("app:close-failed", (event, message) => {
      allowed(event);
      closing = false;
      void dialog.showMessageBox(win!, {
        type: "error",
        message: "Your changes could not be saved. The app will stay open.",
        detail: String(message),
      });
    });
    createWindow();
    setInterval(() => {
      void reminders().catch(() => {});
    }, 60_000);
    setTimeout(() => {
      void reminders().catch(() => {});
    }, 10_000);
  });
  app.on("before-quit", (e) => {
    if (!quitting && win) {
      e.preventDefault();
      requestClose(true);
    }
  });
  app.on("window-all-closed", () => {
    if (!tray) app.quit();
  });
}
