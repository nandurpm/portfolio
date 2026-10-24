import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Envelope } from "../src/domain/types";
import { envelopeFrom } from "../src/domain/history";
/** Backups made before the spelling fix start with "Expence"; both are recovered and rotated. */
const BACKUP_NAME = /^Savings-and-(?:Expense|Expence)-Tracker-\d{4}-.*\.json$/;
export class LocalStore {
  private queue: Promise<void> = Promise.resolve();
  latest: Envelope | null = null;
  constructor(readonly folder: string) {}
  get filename() {
    return path.join(this.folder, "plan.json");
  }
  async load(): Promise<{ envelope: Envelope | null; warning?: string }> {
    await fs.mkdir(this.folder, { recursive: true });
    try {
      this.latest = envelopeFrom(
        JSON.parse(await fs.readFile(this.filename, "utf8")),
      );
      return { envelope: this.latest };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        return { envelope: null };
      const bad = path.join(this.folder, `plan-corrupt-${Date.now()}.json`);
      await fs.copyFile(this.filename, bad).catch(() => {});
      const dir = path.join(this.folder, "backups");
      const files = (await fs.readdir(dir).catch(() => []))
        .filter((n) => BACKUP_NAME.test(n))
        .sort()
        .reverse();
      for (const file of files) {
        try {
          this.latest = envelopeFrom(
            JSON.parse(await fs.readFile(path.join(dir, file), "utf8")),
          );
          return {
            envelope: this.latest,
            warning: `Recovered from ${file}. The unreadable original was preserved.`,
          };
        } catch {}
      }
      throw Error(
        "The data file is unreadable and no valid backup was found. Restore a JSON backup in Reports.",
        { cause: e },
      );
    }
  }
  save(envelope: Envelope) {
    const checked = envelopeFrom(envelope);
    this.latest = checked;
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(this.folder, { recursive: true });
        const tmp = this.filename + ".tmp";
        const handle = await fs.open(tmp, "w", 0o600);
        try {
          await handle.writeFile(JSON.stringify(checked));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(tmp, this.filename);
      });
    return this.queue;
  }
  async backup() {
    await this.queue;
    if (!this.latest) throw Error("No saved plan is available yet.");
    const primary = path.join(this.folder, "backups"),
      custom = this.latest.data.settings.backupFolder;
    const name = `Savings-and-Expense-Tracker-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`;
    const folders = [
      primary,
      ...(custom && path.resolve(custom) !== path.resolve(primary)
        ? [custom]
        : []),
    ];
    for (const dir of folders) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), JSON.stringify(this.latest), {
        mode: 0o600,
      });
      const files = (await fs.readdir(dir))
        .filter((n) => BACKUP_NAME.test(n))
        .sort()
        .reverse();
      for (const old of files.slice(10)) await fs.unlink(path.join(dir, old));
    }
    return path.join(custom || primary, name);
  }
  async storageStatus() {
    await this.queue;
    const primary = await fs.stat(this.filename).catch(() => null);
    const folder = path.join(this.folder, "backups");
    const files = (await fs.readdir(folder).catch(() => [])).filter((name) =>
      BACKUP_NAME.test(name),
    );
    const times = await Promise.all(
      files.map(
        async (name) =>
          (await fs.stat(path.join(folder, name)).catch(() => null))?.mtimeMs ??
          0,
      ),
    );
    const last = Math.max(0, ...times);
    return {
      lastSavedAt: primary?.mtime.toISOString() ?? "",
      lastBackupAt: last ? new Date(last).toISOString() : "",
    };
  }
  async flush() {
    await this.queue;
  }
}
