import { afterEach, expect, it, vi } from "vitest";
import { financialFixture } from "./fixtures/financial";
import { cloudPlan } from "../src/cloud/model";
import type { Session } from "@supabase/supabase-js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("../src/cloud/client");
});

async function setup(linked: boolean, remoteConflict = false) {
  vi.resetModules();
  vi.useFakeTimers();
  const e = financialFixture();
  const base = cloudPlan(e.data);
  if (linked)
    e.sync = {
      ownerId: "11111111-1111-4111-8111-111111111111",
      revision: 1,
      base,
      lastSyncAt: "",
    };
  e.data.settings.opening += 1;
  const remote = structuredClone(base);
  const remoteOpening = (base.settings.opening ?? 0) + 2;
  if (remoteConflict) remote.settings.opening = remoteOpening;
  const remoteRevision = remoteConflict ? 2 : 1;
  const session = (id: string) =>
    ({
      user: { id, email: "synthetic@example.invalid" },
      access_token: `token-${id}`,
      refresh_token: "synthetic",
    }) as Session;
  let change!: (event: string, value: Session | null) => void;
  const headers: string[] = [];
  let holdBackup: (() => void | Promise<void>) | undefined;
  const backup = vi.fn(async () => {
    await holdBackup?.();
    return "synthetic-backup";
  });
  const saveReply = () => ({
    data: { ok: true, revision: 2, data: cloudPlan(e.data) },
    error: null,
  });
  let saveOverride: ((signal: AbortSignal) => Promise<ReturnType<typeof saveReply>>) | undefined;
  const rpc = vi.fn((_name: string, _payload: { p_mutation_id: string }) => ({
    setHeader: (_key: string, token: string) => {
      headers.push(token);
      return {
        abortSignal: (signal: AbortSignal) =>
          saveOverride?.(signal) ?? Promise.resolve(saveReply()),
      };
    },
  }));
  const supabase = {
    auth: {
      getSession: async () => ({
        data: { session: session("11111111-1111-4111-8111-111111111111") },
        error: null,
      }),
      onAuthStateChange: (fn: typeof change) => {
        change = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: (columns: string) => ({
        eq: () => ({
          abortSignal: () => ({
            maybeSingle: () => ({
              setHeader: (_key: string, token: string) => {
                headers.push(token);
                return Promise.resolve({
                  data:
                    columns === "revision"
                      ? { revision: remoteRevision }
                      : { data: remote, revision: remoteRevision },
                  error: null,
                });
              },
            }),
          }),
        }),
      }),
    }),
    rpc,
  };
  vi.doMock("../src/cloud/client", () => ({
    supabase,
    readCachedSession: async () => null,
  }));
  vi.stubGlobal("window", {
    desktop: {
      load: async () => ({ envelope: e, dataPath: "synthetic" }),
      save: vi.fn().mockResolvedValue(undefined),
      backup,
    },
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  });
  const { store } = await import("../src/store");
  await store.load();
  const { sync } = await import("../src/cloud/sync");
  await sync.start();
  return {
    sync,
    store,
    rpc,
    headers,
    backup,
    remoteOpening,
    saveReply,
    overrideSave: (fn?: typeof saveOverride) => { saveOverride = fn; },
    change: (id: string | null) => change("SIGNED_IN", id ? session(id) : null),
    onBackup: (fn: () => void | Promise<void>) => {
      holdBackup = fn;
    },
  };
}

it("binds sync requests to the starting account token and locks preserved data on logout", async () => {
  const t = await setup(true);
  await t.sync.run();
  expect(t.rpc).toHaveBeenCalledOnce();
  expect(
    t.headers.every(
      (h) => h === "Bearer token-11111111-1111-4111-8111-111111111111",
    ),
  ).toBe(true);
  const before = JSON.stringify(t.store.get());
  await t.sync.signOut();
  expect(t.sync.get()).toMatchObject({ session: null, locked: true });
  expect(JSON.stringify(t.store.get())).toBe(before);
  t.change("22222222-2222-4222-8222-222222222222");
  await Promise.resolve();
  expect(t.sync.get().locked).toBe(true);
  await t.sync.run();
  expect(t.rpc).toHaveBeenCalledOnce();
  t.sync.stop();
});

it("does not upload a prior workspace when the account changes during pre-link backup", async () => {
  const t = await setup(false);
  await t.sync.run();
  t.onBackup(() => t.change("22222222-2222-4222-8222-222222222222"));
  await t.sync.connect("device");
  expect(t.rpc).not.toHaveBeenCalled();
  expect(t.sync.get().error).toContain("Account changed");
  expect(t.store.get().sync).toBeUndefined();
  t.sync.stop();
});

it("creates a native recovery backup before accepting the complete cloud version", async () => {
  const t = await setup(true, true);
  await t.sync.run();
  expect(t.sync.get().review?.conflicts).toHaveLength(1);
  const localBefore = JSON.stringify(t.store.get());
  let backupSnapshot = "";
  t.onBackup(() => { backupSnapshot = JSON.stringify(t.store.get()); });

  await t.sync.useCloudReview();

  expect(t.backup).toHaveBeenCalledOnce();
  expect(backupSnapshot).toBe(localBefore);
  expect(t.store.get().data.settings.opening).toBe(t.remoteOpening);
  t.sync.stop();
});

it("does not replace native data if the account changes during the conflict backup", async () => {
  const t = await setup(true, true);
  await t.sync.run();
  const localBefore = JSON.stringify(t.store.get());
  t.onBackup(async () => {
    t.change("22222222-2222-4222-8222-222222222222");
    await Promise.resolve();
  });

  await expect(t.sync.useCloudReview()).rejects.toThrow("Account changed");
  expect(t.backup).toHaveBeenCalledOnce();
  expect(JSON.stringify(t.store.get())).toBe(localBefore);
  expect(t.sync.get().locked).toBe(true);
  t.sync.stop();
});


it("keeps the full local envelope and reuses the mutation ID after a timed-out save", async () => {
  const t = await setup(true);
  const original = structuredClone(t.store.get());
  let firstSignal: AbortSignal | undefined;
  let lateReply: (() => void) | undefined;
  t.overrideSave((signal) => {
    firstSignal = signal;
    return new Promise((resolve) => {
      lateReply = () => resolve(t.saveReply());
    });
  });

  const first = t.sync.run();
  await vi.advanceTimersByTimeAsync(20_000);
  await first;

  expect(firstSignal?.aborted).toBe(true);
  expect(t.sync.get()).toMatchObject({ busy: false, status: "Sync needs attention" });
  expect(t.sync.get().error).toContain("Local changes are retained");
  expect(t.store.get()).toEqual(original);
  expect(t.rpc).toHaveBeenCalledTimes(1);

  lateReply?.();
  await Promise.resolve();
  expect(t.store.get()).toEqual(original);

  t.overrideSave();
  await t.sync.run();
  expect(t.rpc).toHaveBeenCalledTimes(2);
  expect(t.rpc.mock.calls[1]?.[1].p_mutation_id).toBe(t.rpc.mock.calls[0]?.[1].p_mutation_id);
  expect(t.sync.get()).toMatchObject({ busy: false, status: "Up to date" });
  expect(t.store.get().data).toEqual(original.data);
  expect(t.store.get().sync?.revision).toBe(2);
  t.sync.stop();
});
